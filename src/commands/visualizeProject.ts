import * as vscode from 'vscode';
import { createVisualizationPanel, generateMermaidDiagram } from '../visualization/visualizer';
import { handleExport } from '../export/exportHandler';
import { ContractGraph } from '../types/graph';
import { detectLanguage, parseContractWithImports, getFunctionTypeFilters } from '../parser/parserUtils';
import { logError } from '../logger';

let panel: vscode.WebviewPanel | undefined;

export async function visualizeProject(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
    let document: vscode.TextDocument;
    let code: string;
    let filePath: string;

    if (fileUri) {
        try {
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            code = Buffer.from(fileData).toString('utf8');
            filePath = fileUri.fsPath;
            document = await vscode.workspace.openTextDocument(fileUri);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Could not read file: ${error.message || String(error)}`);
            return;
        }
    } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        document = editor.document;
        code = document.getText();
        filePath = document.uri.fsPath;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Visualizing contract project...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 20, message: 'Detecting language...' });
            const language = detectLanguage(filePath);

            progress.report({ increment: 30, message: 'Processing imports...' });
            let originalGraph = await parseContractWithImports(code, filePath, language);

            progress.report({ increment: 30, message: 'Generating visualization...' });
            if (panel) {
                panel.dispose();
            }

            panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language), 'Contract Project Visualization');

            panel.onDidDispose(() => {
                panel = undefined;
            }, null, context.subscriptions);

            panel!.webview.onDidReceiveMessage(
                async (message) => {
                    if (message.command === 'applyFilters') {
                        try {
                            const selectedTypes = message.selectedTypes as string[];
                            const nameFilter = message.nameFilter ? message.nameFilter.trim().toLowerCase() : '';

                            const remainingNodeIds = new Set<string>();
                            const nodesPassingTypeFilter = originalGraph.nodes.filter(node => {
                                const nodeType = node.functionType || 'regular';
                                const shouldKeep = selectedTypes.includes(nodeType);
                                if (shouldKeep) {
                                    remainingNodeIds.add(node.id);
                                }
                                return shouldKeep;
                            });

                            let filteredNodes = nodesPassingTypeFilter;
                            if (nameFilter) {
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

                                const connectedNodeIds = new Set<string>();
                                originalGraph.edges.forEach(edge => {
                                    if (matchingNodeIds.has(edge.from) && remainingNodeIds.has(edge.to)) {
                                        connectedNodeIds.add(edge.to);
                                    }
                                    if (matchingNodeIds.has(edge.to) && remainingNodeIds.has(edge.from)) {
                                        connectedNodeIds.add(edge.from);
                                    }
                                });

                                const visibleNodeIds = new Set([...matchingNodeIds, ...connectedNodeIds]);
                                filteredNodes = nodesPassingTypeFilter.filter(node =>
                                    visibleNodeIds.has(node.id)
                                );
                            }

                            const finalNodeIds = new Set(filteredNodes.map(node => node.id));
                            const filteredEdges = originalGraph.edges.filter(edge =>
                                finalNodeIds.has(edge.from) && finalNodeIds.has(edge.to)
                            );

                            const filteredGraph: ContractGraph = {
                                nodes: filteredNodes,
                                edges: filteredEdges,
                            };

                            const newMermaidDiagram = generateMermaidDiagram(filteredGraph);

                            panel!.webview.postMessage({
                                command: 'updateDiagram',
                                diagram: newMermaidDiagram
                            });

                        } catch (filterError: any) {
                            logError('Error applying filters', filterError);
                            vscode.window.showErrorMessage(`Error applying filters: ${filterError.message || String(filterError)}`);
                            panel!.webview.postMessage({
                                command: 'filterError',
                                error: filterError.message || String(filterError)
                            });
                        }
                    } else {
                        await handleExport(panel!, message, context);
                    }
                },
                undefined,
                context.subscriptions
            );

            progress.report({ increment: 20, message: 'Opening visualization...' });
            panel!.reveal(vscode.ViewColumn.Beside);
        });
    } catch (error: any) {
        logError('Error visualizing contract project', error);
        vscode.window.showErrorMessage(`Error visualizing contract project: ${error.message || String(error)}`);
    }
}
