import * as vscode from 'vscode';
import { createVisualizationPanel, generateMermaidDiagram } from './visualization/visualizer';
import { handleExport } from './export/exportHandler';
import { ContractGraph } from './types/graph';
import { detectLanguage, parseContractByLanguage, getFunctionTypeFilters, parseContractWithImports } from './parser/parserUtils';
import { logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
    logger.info('TON Graph extension is now active');

    // Create the cached directory for storing the Mermaid library
    const cachedDir = vscode.Uri.joinPath(context.extensionUri, 'cached');
    try {
        vscode.workspace.fs.createDirectory(cachedDir);
        logger.info('Cached directory created/verified');
    } catch (err) {
        // Directory might already exist, that's fine
        logger.info('Note: Cached directory may already exist');
    }

    let disposable = vscode.commands.registerCommand('ton-graph.visualize', async (fileUri?: vscode.Uri) => {
        let document: vscode.TextDocument;
        let code: string;
        const source = fileUri ? 'explorer' : 'editor';
        logger.info(`Command visualize triggered from ${source}`);

        // If invoked from explorer context menu, fileUri will be provided
        if (fileUri) {
            try {
                logger.info(`Reading file ${fileUri.fsPath}`);
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                code = Buffer.from(fileData).toString('utf8');

                // Open the document to get the language mode correctly set
                document = await vscode.workspace.openTextDocument(fileUri);
                logger.info(`Opened document ${document.uri.fsPath}`);
            } catch (error: any) {
                logger.error(`Could not read file: ${error.message || String(error)}`, fileUri);
                vscode.window.showErrorMessage(`Could not read file: ${error.message || String(error)}`);
                return;
            }
        } else {
            // Invoked from editor context menu
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                logger.error('No active editor found');
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            document = editor.document;
            logger.info(`Using active editor document ${document.uri.fsPath}`);
            code = document.getText();
        }

        let originalGraph: ContractGraph | null = null; // Store the original graph
        
        try {
            // Detect language and use appropriate parser
            const language = detectLanguage(document.fileName);
            logger.info(`Detected language ${language} for ${document.fileName}`);
            originalGraph = await parseContractByLanguage(code, language);
            logger.info('Contract parsed successfully');

            // Create and show the webview with language-specific function type filters
            const panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language));
            logger.info('Visualization panel created');

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    if (message.command === 'applyFilters') {
                        if (!originalGraph) {
                            logger.error('Original graph data not available for filtering.', document.uri);
                            vscode.window.showErrorMessage('Cannot apply filters: original graph data is missing.');
                            return;
                        }
                        try {
                            const selectedTypes = message.selectedTypes as string[];
                            const nameFilter = message.nameFilter ? message.nameFilter.trim().toLowerCase() : '';

                            // 1. Filter nodes by type
                            const remainingNodeIds = new Set<string>();
                            const nodesPassingTypeFilter = originalGraph.nodes.filter(node => {
                                // Define node type (use 'regular' as default if type not specified)
                                const nodeType = node.functionType || 'regular';
                                const shouldKeep = selectedTypes.includes(nodeType);
                                if (shouldKeep) {
                                    remainingNodeIds.add(node.id); // Save IDs of remaining nodes
                                }
                                return shouldKeep;
                            });

                            // 2. If nameFilter exists, apply name filtering
                            let filteredNodes = nodesPassingTypeFilter;
                            if (nameFilter) {
                                // Find nodes matching the name filter
                                const matchingNodeIds = new Set<string>();
                                const nameMatchedNodes = nodesPassingTypeFilter.filter(node => {
                                    const label = node.label.toLowerCase();
                                    const id = node.id.toLowerCase();

                                    if (label.includes(nameFilter) || id.includes(nameFilter)) {
                                        matchingNodeIds.add(node.id);
                                        return true;
                                    }
                                    return false;
                                });

                                // Find directly connected nodes
                                const connectedNodeIds = new Set<string>();
                                originalGraph.edges.forEach(edge => {
                                    if (matchingNodeIds.has(edge.from) && remainingNodeIds.has(edge.to)) {
                                        connectedNodeIds.add(edge.to);
                                    }
                                    if (matchingNodeIds.has(edge.to) && remainingNodeIds.has(edge.from)) {
                                        connectedNodeIds.add(edge.from);
                                    }
                                });

                                // Combine matching and connected nodes
                                const visibleNodeIds = new Set([...matchingNodeIds, ...connectedNodeIds]);

                                // Keep only nodes that passed the name filter or are connected to them
                                filteredNodes = nodesPassingTypeFilter.filter(node =>
                                    visibleNodeIds.has(node.id)
                                );
                            }

                            // 3. Filter edges (keep only those where both ends remain)
                            const finalNodeIds = new Set(filteredNodes.map(node => node.id));
                            const filteredEdges = originalGraph.edges.filter(edge =>
                                finalNodeIds.has(edge.from) && finalNodeIds.has(edge.to)
                            );

                            // 4. Create filtered graph
                            const filteredGraph: ContractGraph = {
                                nodes: filteredNodes,
                                edges: filteredEdges,
                            };

                            // 5. Generate new Mermaid diagram (with new clustering)
                            const newMermaidDiagram = generateMermaidDiagram(filteredGraph);

                            // 6. Send the new diagram to WebView
                            panel.webview.postMessage({
                                command: 'updateDiagram',
                                diagram: newMermaidDiagram
                            });

                        } catch (filterError: any) {
                            logger.error(`Error applying filters: ${filterError.message || String(filterError)}`, document.uri);
                            vscode.window.showErrorMessage(`Error applying filters: ${filterError.message || String(filterError)}`);
                            // Send error message back to WebView
                            panel.webview.postMessage({
                                command: 'filterError',
                                error: filterError.message || String(filterError)
                            });
                        }

                    } else {
                        // Handle other commands, e.g. export
                        await handleExport(panel, message, context);
                    }
                },
                undefined,
                context.subscriptions
            );

            panel.reveal(vscode.ViewColumn.Beside);
        } catch (error: any) {
            logger.error(`Error visualizing contract: ${error.message || String(error)}`, document.uri);
            vscode.window.showErrorMessage(`Error visualizing contract: ${error.message || String(error)}`);
            originalGraph = null; // Reset on error
        }
    });

    context.subscriptions.push(disposable);

    // Register the command to visualize contract with imports
    let projectDisposable = vscode.commands.registerCommand('ton-graph.visualizeProject', async (fileUri?: vscode.Uri) => {
        let document: vscode.TextDocument;
        let code: string;
        let filePath: string;
        const source = fileUri ? 'explorer' : 'editor';
        logger.info(`Command visualizeProject triggered from ${source}`);

        // If invoked from explorer context menu, fileUri will be provided
        if (fileUri) {
            try {
                logger.info(`Reading file ${fileUri.fsPath}`);
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                code = Buffer.from(fileData).toString('utf8');
                filePath = fileUri.fsPath;

                document = await vscode.workspace.openTextDocument(fileUri);
                logger.info(`Opened document ${document.uri.fsPath}`);
            } catch (error: any) {
                logger.error(`Could not read file: ${error.message || String(error)}`, fileUri);
                vscode.window.showErrorMessage(`Could not read file: ${error.message || String(error)}`);
                return;
            }
        } else {
            // Invoked from editor context menu
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                logger.error('No active editor found');
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            document = editor.document;
            logger.info(`Using active editor document ${document.uri.fsPath}`);
            code = document.getText();
            filePath = document.uri.fsPath;
        }

        try {
            // Show a progress indicator
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Visualizing contract project...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 20, message: "Detecting language..." });

                // Detect language
                const language = detectLanguage(filePath);
                logger.info(`Detected language ${language} for ${filePath}`);

                progress.report({ increment: 30, message: "Processing imports..." });
                logger.info('Processing imports');

                // Parse contract with imports
                let originalGraph = await parseContractWithImports(code, filePath, language);
                logger.info('Contract with imports parsed');

                progress.report({ increment: 30, message: "Generating visualization..." });
                logger.info('Generating visualization');

                // Create and show the webview
                const panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language), "Contract Project Visualization");
                logger.info('Visualization panel created for project');

                // Handle messages from the webview (same as in visualize command)
                panel.webview.onDidReceiveMessage(
                    async (message) => {
                        if (message.command === 'applyFilters') {
                            try {
                                const selectedTypes = message.selectedTypes as string[];
                                const nameFilter = message.nameFilter ? message.nameFilter.trim().toLowerCase() : '';

                                // 1. Filter nodes by type
                                const remainingNodeIds = new Set<string>();
                                const nodesPassingTypeFilter = originalGraph.nodes.filter(node => {
                                    // Define node type (use 'regular' as default if type not specified)
                                    const nodeType = node.functionType || 'regular';
                                    const shouldKeep = selectedTypes.includes(nodeType);
                                    if (shouldKeep) {
                                        remainingNodeIds.add(node.id); // Save IDs of remaining nodes
                                    }
                                    return shouldKeep;
                                });

                                // 2. If nameFilter exists, apply name filtering
                                let filteredNodes = nodesPassingTypeFilter;
                                if (nameFilter) {
                                    // Find nodes matching the name filter
                                    const matchingNodeIds = new Set<string>();
                                    const nameMatchedNodes = nodesPassingTypeFilter.filter(node => {
                                        const label = node.label.toLowerCase();
                                        const id = node.id.toLowerCase();

                                        if (label.includes(nameFilter) || id.includes(nameFilter)) {
                                            matchingNodeIds.add(node.id);
                                            return true;
                                        }
                                        return false;
                                    });

                                    // Find directly connected nodes
                                    const connectedNodeIds = new Set<string>();
                                    originalGraph.edges.forEach(edge => {
                                        if (matchingNodeIds.has(edge.from) && remainingNodeIds.has(edge.to)) {
                                            connectedNodeIds.add(edge.to);
                                        }
                                        if (matchingNodeIds.has(edge.to) && remainingNodeIds.has(edge.from)) {
                                            connectedNodeIds.add(edge.from);
                                        }
                                    });

                                    // Combine matching and connected nodes
                                    const visibleNodeIds = new Set([...matchingNodeIds, ...connectedNodeIds]);

                                    // Keep only nodes that passed the name filter or are connected to them
                                    filteredNodes = nodesPassingTypeFilter.filter(node =>
                                        visibleNodeIds.has(node.id)
                                    );
                                }

                                // 3. Filter edges (keep only those where both ends remain)
                                const finalNodeIds = new Set(filteredNodes.map(node => node.id));
                                const filteredEdges = originalGraph.edges.filter(edge =>
                                    finalNodeIds.has(edge.from) && finalNodeIds.has(edge.to)
                                );

                                // 4. Create filtered graph
                                const filteredGraph: ContractGraph = {
                                    nodes: filteredNodes,
                                    edges: filteredEdges,
                                };

                                // 5. Generate new Mermaid diagram
                                const newMermaidDiagram = generateMermaidDiagram(filteredGraph);

                                // 6. Send the new diagram to WebView
                                panel.webview.postMessage({
                                    command: 'updateDiagram',
                                    diagram: newMermaidDiagram
                                });

                            } catch (filterError: any) {
                                logger.error(`Error applying filters: ${filterError.message || String(filterError)}`, document.uri);
                                vscode.window.showErrorMessage(`Error applying filters: ${filterError.message || String(filterError)}`);
                                panel.webview.postMessage({
                                    command: 'filterError',
                                    error: filterError.message || String(filterError)
                                });
                            }
                        } else {
                            // Handle other commands, e.g. export
                            await handleExport(panel, message, context);
                        }
                    },
                    undefined,
                    context.subscriptions
                );

                progress.report({ increment: 20, message: "Opening visualization..." });
                panel.reveal(vscode.ViewColumn.Beside);
            });
        } catch (error: any) {
            logger.error(`Error visualizing contract project: ${error.message || String(error)}`, document.uri);
            vscode.window.showErrorMessage(`Error visualizing contract project: ${error.message || String(error)}`);
        }
    });

    context.subscriptions.push(projectDisposable);
}

export function deactivate() {
    logger.info('TON Graph extension deactivated');
    logger.clear();
}
