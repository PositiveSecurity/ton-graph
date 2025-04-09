import * as vscode from 'vscode';
import { createVisualizationPanel, generateMermaidDiagram } from './visualization/visualizer';
import { handleExport } from './export/exportHandler';
import { ContractGraph } from './types/graph';
import { detectLanguage, parseContractByLanguage, getFunctionTypeFilters } from './parser/parserUtils';

export function activate(context: vscode.ExtensionContext) {
    console.log('TON Graph extension is now active');

    // Create the cached directory for storing the Mermaid library
    const cachedDir = vscode.Uri.joinPath(context.extensionUri, 'cached');
    try {
        vscode.workspace.fs.createDirectory(cachedDir);
        console.log('Cached directory created/verified');
    } catch (err) {
        // Directory might already exist, that's fine
        console.log('Note: Cached directory may already exist');
    }

    let disposable = vscode.commands.registerCommand('ton-graph.visualize', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        const code = document.getText();

        let originalGraph: ContractGraph | null = null; // Store the original graph

        try {
            // Detect language and use appropriate parser
            const language = detectLanguage(document.fileName);
            originalGraph = await parseContractByLanguage(code, language);

            // Create and show the webview with language-specific function type filters
            const panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language));

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    if (message.command === 'applyFilters') {
                        if (!originalGraph) {
                            console.error('Original graph data not available for filtering.');
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
                            console.error('Error applying filters:', filterError);
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
            console.error('Error visualizing contract:', error);
            vscode.window.showErrorMessage(`Error visualizing contract: ${error.message || String(error)}`);
            originalGraph = null; // Reset on error
        }
    });

    context.subscriptions.push(disposable);
}