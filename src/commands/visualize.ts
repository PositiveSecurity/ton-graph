import * as vscode from 'vscode';
import { createVisualizationPanel, generateMermaidDiagram } from '../visualization/visualizer';
import { handleExport } from '../export/exportHandler';
import { ContractGraph } from '../types/graph';
import { detectLanguage, parseContractByLanguage, getFunctionTypeFilters } from '../parser/parserUtils';
import { logError } from '../logger';

let panel: vscode.WebviewPanel | undefined;

export async function visualize(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
    let document: vscode.TextDocument;
    let code: string;

    if (fileUri) {
        try {
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            code = Buffer.from(fileData).toString('utf8');
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
    }

    let originalGraph: ContractGraph | null = null;

    try {
        const language = detectLanguage(document.fileName);
        originalGraph = await parseContractByLanguage(code, language);

        if (panel) {
            panel.dispose();
        }

        panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language));

        panel.onDidDispose(() => {
            panel = undefined;
        }, null, context.subscriptions);

        panel!.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'applyFilters') {
                    if (!originalGraph) {
                        logError('Original graph data not available for filtering');
                        vscode.window.showErrorMessage('Cannot apply filters: original graph data is missing.');
                        return;
                    }
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

        panel!.reveal(vscode.ViewColumn.Beside);
    } catch (error: any) {
        logError('Error visualizing contract', error);
        vscode.window.showErrorMessage(`Error visualizing contract: ${error.message || String(error)}`);
        originalGraph = null;
    }
}
