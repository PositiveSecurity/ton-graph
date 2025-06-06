import * as vscode from 'vscode';
import * as path from 'path';
import { ContractGraph } from '../types/graph';
import { GraphNodeKind } from '../types/graphNodeKind';
import { generateVisualizationHtml, filterMermaidDiagram } from './templates';
import logger from '../logging/logger';

// Map panels to their original graphs
const panelGraphs = new WeakMap<vscode.WebviewPanel, ContractGraph>();

// URI to the bundled Mermaid script
let bundledMermaidUri: vscode.Uri | undefined;

function escapeMermaidLabel(text: string): string {
    return text
        .replace(/"/g, "'")
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*/g, '\\*')
        .replace(/\+/g, '\\+')
        .replace(/\-/g, '\\-')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

export function createVisualizationPanel(
    context: vscode.ExtensionContext,
    graph: ContractGraph,
    functionTypeFilters: { value: string; label: string; }[],
    title = 'TON Graph'
): vscode.WebviewPanel {
    // Store the original graph associated with this panel
    const panel = vscode.window.createWebviewPanel(
        'tonMessageFlow',
        title,
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, 'cached'))
            ]
        }
    );

    panelGraphs.set(panel, graph);

    // Get path to the visualization lib directory
    const extensionPath = context.extensionPath;

    // Get the Mermaid script URI (either cached or from CDN)
    Promise.all([
        getMermaidScriptUri(context, panel.webview),
        getWebviewScriptUri(context, panel.webview)
    ]).then(([mermaidScriptUri, webviewScriptUri]) => {

        const theme = vscode.workspace.getConfiguration('ton-graph').get<string>('theme', 'default');

        // Generate Mermaid diagram from graph
        const mermaidDiagram = generateMermaidDiagram(graph);

        // Generate the final HTML with function type filters
        const html = generateVisualizationHtml(mermaidDiagram, mermaidScriptUri, functionTypeFilters, webviewScriptUri, panel.webview, theme);

        // Set the HTML content for the panel
        panel.webview.html = html;
    }).catch(error => {
        logger.error('Error loading Mermaid library', error);
        vscode.window.showErrorMessage(`Error loading Mermaid library: ${error.message}`);
    });

    // Set up message handling for filter requests from the webview
    panel.webview.onDidReceiveMessage(
        message => {
            try {
                if (message.command === 'applyFilters') {
                    if (!panelGraphs.get(panel)) {
                        panel.webview.postMessage({
                            command: 'filterError',
                            error: 'Original graph not found for this panel.'
                        });
                        return;
                    }

                    const mermaidUri = bundledMermaidUri
                        ? panel.webview.asWebviewUri(bundledMermaidUri).toString()
                        : '';
                    handleFilterRequest(
                        panel,
                        message.selectedTypes,
                        mermaidUri,
                        message.nameFilter
                    );
                } else if (
                    message.command === 'saveMermaid' ||
                    message.command === 'saveSvg' ||
                    message.command === 'savePng' ||
                    message.command === 'saveJpg'
                ) {
                    // Handle other messages (export commands, etc.)
                }
            } catch (error) {
                logger.error('Error handling message from webview', error);
                panel.webview.postMessage({
                    command: 'filterError',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        },
        undefined,
        context.subscriptions
    );

    // Handle panel disposal
    panel.onDidDispose(
        () => {
            // Clean up resources for this panel
            panelGraphs.delete(panel);
        },
        null,
        context.subscriptions
    );

    return panel;
}

/**
 * Get the Mermaid script URI, either from cache or download it
 */
async function getMermaidScriptUri(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<string> {
    if (!bundledMermaidUri) {
        const filePath = path.join(context.extensionPath, 'cached', 'mermaid.min.js');
        bundledMermaidUri = vscode.Uri.file(filePath);
        try {
            const fileUrl = bundledMermaidUri.with({ scheme: 'file' }).toString();
            await import(fileUrl);
        } catch {
            // Ignore import errors as the file may not be a valid module
        }
    }
    return webview.asWebviewUri(bundledMermaidUri).toString();
}

async function getWebviewScriptUri(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<string> {
    const filePath = path.join(context.extensionPath, 'dist', 'webview.js');
    const uri = vscode.Uri.file(filePath);
    return webview.asWebviewUri(uri).toString();
}

/**
 * Handle a filter request from the webview by filtering the graph and returning an updated diagram
 */
function handleFilterRequest(panel: vscode.WebviewPanel, selectedTypes: string[], mermaidScriptUri: string, nameFilter?: string) {
    try {
        const graph = panelGraphs.get(panel);
        if (!graph) {
            panel.webview.postMessage({
                command: 'filterError',
                error: 'Original graph not found for this panel.'
            });
            return;
        }

        // Get name filter from the message if it exists
        const nameFilterValue = nameFilter?.trim();

        // 1. Always generate the full diagram from the original graph
        const fullMermaidDiagram = generateMermaidDiagram(graph);

        // 2. Apply filtering (both type and name) using filterMermaidDiagram
        const filteredDiagram = filterMermaidDiagram(
            fullMermaidDiagram,
            selectedTypes || [], // Pass selected types (or empty array if none)
            nameFilterValue     // Pass the name filter value (or undefined)
        );

        // 3. Send the final filtered diagram back to the webview
        panel.webview.postMessage({
            command: 'updateDiagram',
            diagram: filteredDiagram
        });

    } catch (error) {
        logger.error('Error handling filter request', error);
        panel.webview.postMessage({
            command: 'filterError',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

export function generateMermaidDiagram(graph: ContractGraph): string {
    // Change direction to TB (top to bottom) for more compact layout
    let diagram = 'graph TB;\n';

    // Apply clustering to organize the graph
    const nodeClusters = clusterNodes(graph);

    const clusterGroups: Record<string, typeof graph.nodes> = {};
    const clusterIds = new Map<string, number>();
    let cid = 0;

    graph.nodes.forEach(node => {
        const clusterName = nodeClusters.get(node.id) || '';
        if (!clusterIds.has(clusterName)) {
            clusterIds.set(clusterName, cid++);
        }
        const id = clusterIds.get(clusterName)!;
        if (!clusterGroups[id]) {
            clusterGroups[id] = [];
        }
        clusterGroups[id].push(node);
    });

    const clusterNames: Record<string, string> = {};
    clusterIds.forEach((index, name) => {
        clusterNames[String(index)] = name || 'Main';
    });

    // Generate subgraphs for each cluster
    Object.entries(clusterGroups).forEach(([cluster, nodes]) => {
        const clusterIndex = Number(cluster);

        diagram += `    subgraph Cluster_${clusterIndex}["${clusterNames[cluster]}"]\n`;

        // Add nodes
        nodes.forEach(node => {
            const id = node.id.replace(/[^a-zA-Z0-9]/g, '_');
            const nodeId = `${id}_${node.functionType || 'regular'}`;

            // Get just the function name without parameters
            let label = node.label.split('(')[0];

            // Escape any markdown characters in labels
            label = escapeMermaidLabel(label);

            // Use different node shapes based on function type
            if (node.functionType === 'public') {
                diagram += `        ${nodeId}(("${label}"))\n`;
            } else if (node.type === GraphNodeKind.Entry) {
                diagram += `        ${nodeId}(["${label}"])\n`;
            } else if (node.type === GraphNodeKind.External) {
                diagram += `        ${nodeId}[["${label}"]]\n`;
            } else {
                diagram += `        ${nodeId}["${label}"]\n`;
            }
        });

        diagram += `    end\n\n`;
    });

    // Generate edges
    graph.edges.forEach(edge => {
        const fromId = edge.from.replace(/[^a-zA-Z0-9]/g, '_');
        const toId = edge.to.replace(/[^a-zA-Z0-9]/g, '_');

        // Find the target node to get its parameters and type
        const targetNode = graph.nodes.find(node => node.id === edge.to);
        let label = '';

        // Add parameters to the edge label if available
        if (targetNode?.parameters && targetNode.parameters.length > 0) {
            // Filter out any comments from parameters
            const filteredParameters = targetNode.parameters
                .filter(param => {
                    // Filter out FunC comments (;;) and regular comments (//)
                    const trimmedParam = param.trim();
                    return !trimmedParam.startsWith(';;') &&
                        !trimmedParam.startsWith('//');
                })
                .map(param => {
                    // Remove inline comments from parameters
                    return param.replace(/\s*;;.*$/, '')  // Remove FunC comments
                        .replace(/\s*\/\/.*$/, ''); // Remove regular comments
                });

            // Show all parameters without limiting
            label = filteredParameters.length > 0 ?
                `(${filteredParameters.join(', ')})` : '()';
        }

        // Escape any markdown characters in labels
        label = escapeMermaidLabel(label);

        // Check if this is a cross-cluster edge
        const fromClusterName = nodeClusters.get(edge.from) || '';
        const toClusterName = nodeClusters.get(edge.to) || '';
        const fromCluster = clusterIds.get(fromClusterName) || 0;
        const toCluster = clusterIds.get(toClusterName) || 0;

        // Add function type to node IDs
        const fromNode = graph.nodes.find(node => node.id === edge.from);
        const toNode = graph.nodes.find(node => node.id === edge.to);
        const fromNodeId = `${fromId}_${fromNode?.functionType || 'regular'}`;
        const toNodeId = `${toId}_${toNode?.functionType || 'regular'}`;

        if (fromCluster !== toCluster) {
            // Use a different arrow style for cross-cluster edges
            diagram += `    ${fromNodeId} ==>${label ? `|"${label}"|` : ''} ${toNodeId}\n`;
        } else {
            diagram += `    ${fromNodeId} -->${label ? `|"${label}"|` : ''} ${toNodeId}\n`;
        }
    });

    // Add style definitions
    const colors = ['#fae8ee', '#e8faee', '#e8eefa', '#faefe8', '#eee8fa', '#e8faef', '#fafae8', '#e8fafa'];

    // Define styles for each cluster
    Object.keys(clusterGroups).forEach((cluster, index) => {
        const color = colors[index % colors.length];
        diagram += `    classDef cluster${cluster} fill:${color},stroke:#333,stroke-width:1px;\n`;
    });
    diagram += `    classDef public fill:#ffd966,stroke:#333,stroke-width:2px;\n`;

    // Apply styles to nodes
    graph.nodes.forEach(node => {
        const id = node.id.replace(/[^a-zA-Z0-9]/g, '_');
        const nodeId = `${id}_${node.functionType || 'regular'}`;
        const clusterName = nodeClusters.get(node.id) || '';
        const cluster = clusterIds.get(clusterName) || 0;
        diagram += `    class ${nodeId} cluster${cluster};\n`;
        if (node.functionType === 'public') {
            diagram += `    class ${nodeId} public;\n`;
        }
    });

    return diagram;
}

/**
 * Cluster nodes in the graph
 */
export function clusterNodes(graph: ContractGraph): Map<string, string> {
    const nodeClusters = new Map<string, string>();
    graph.nodes.forEach(node => {
        nodeClusters.set(node.id, node.contractName || '');
    });
    return nodeClusters;
}
