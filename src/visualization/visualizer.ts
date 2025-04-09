import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ContractGraph } from '../types/graph';
import { generateVisualizationHtml, filterMermaidDiagram } from './templates';

// Store the original graph
let originalGraph: ContractGraph;

// Add a variable to track if Mermaid has been cached
let cachedMermaidUri: vscode.Uri | undefined;

export function createVisualizationPanel(context: vscode.ExtensionContext, graph: ContractGraph, functionTypeFilters: { value: string; label: string; }[]): vscode.WebviewPanel {
    // Store the original graph
    originalGraph = graph;

    // Create and show panel
    const panel = vscode.window.createWebviewPanel(
        'tonMessageFlow',
        'TON Graph',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'cached')
            ]
        }
    );

    // Get path to the visualization lib directory
    const extensionPath = context.extensionPath;
    console.log(`Extension path: ${extensionPath}`);

    // Get the Mermaid script URI (either cached or from CDN)
    getMermaidScriptUri(context, panel.webview).then(mermaidScriptUri => {
        console.log(`Using Mermaid from: ${mermaidScriptUri}`);

        // Generate Mermaid diagram from graph
        const mermaidDiagram = generateMermaidDiagram(graph);

        // Generate the final HTML with function type filters
        const html = generateVisualizationHtml(mermaidDiagram, mermaidScriptUri, functionTypeFilters);

        // Set the HTML content for the panel
        panel.webview.html = html;
    }).catch(error => {
        console.error('Error loading Mermaid library:', error);
        vscode.window.showErrorMessage(`Error loading Mermaid library: ${error.message}`);
    });

    // Set up message handling for filter requests from the webview
    panel.webview.onDidReceiveMessage(
        message => {
            try {
                if (message.command === 'applyFilters') {
                    // Use the cached mermaid URI if available
                    const mermaidUri = cachedMermaidUri ? panel.webview.asWebviewUri(cachedMermaidUri).toString() :
                        "https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js";
                    handleFilterRequest(panel, message.selectedTypes, mermaidUri, message.nameFilter);
                } else if (message.command === 'saveMermaid' || message.command === 'saveSvg' ||
                    message.command === 'savePng' || message.command === 'saveJpg') {
                    // Handle other messages (export commands, etc.)
                }
            } catch (error) {
                console.error('Error handling message from webview:', error);
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
            // Clean up resources
            originalGraph = undefined as any;
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
    const cdnUrl = "https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js";

    // Check if we already have a cached version
    if (cachedMermaidUri) {
        return webview.asWebviewUri(cachedMermaidUri).toString();
    }

    try {
        // Create cached directory if it doesn't exist
        const cachedDir = vscode.Uri.joinPath(context.extensionUri, 'cached');
        try {
            await vscode.workspace.fs.createDirectory(cachedDir);
        } catch (err) {
            // Directory might already exist, that's okay
        }

        // Local path to save the cached file
        const localMermaidPath = vscode.Uri.joinPath(cachedDir, 'mermaid.min.js');

        try {
            // Check if file already exists locally
            await vscode.workspace.fs.stat(localMermaidPath);
            console.log('Using cached Mermaid library');
            cachedMermaidUri = localMermaidPath;
            return webview.asWebviewUri(localMermaidPath).toString();
        } catch {
            // File doesn't exist yet, fetch it
            console.log('Downloading Mermaid library from CDN');

            // Fetch the library from CDN
            const response = await fetch(cdnUrl);
            if (!response.ok) {
                throw new Error(`Failed to download: ${response.statusText}`);
            }

            const mermaidJs = await response.text();

            // Write to local file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(localMermaidPath, encoder.encode(mermaidJs));

            // Cache the URI for future use
            cachedMermaidUri = localMermaidPath;

            return webview.asWebviewUri(localMermaidPath).toString();
        }
    } catch (error) {
        console.error('Error caching Mermaid library:', error);
        // Fallback to CDN if caching fails
        return cdnUrl;
    }
}

/**
 * Handle a filter request from the webview by filtering the graph and returning an updated diagram
 */
function handleFilterRequest(panel: vscode.WebviewPanel, selectedTypes: string[], mermaidScriptUri: string, nameFilter?: string) {
    try {
        // Get name filter from the message if it exists
        const nameFilterValue = nameFilter?.trim();

        // 1. Always generate the full diagram from the original graph
        const fullMermaidDiagram = generateMermaidDiagram(originalGraph);

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
        console.error('Error handling filter request:', error);
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

    // Group nodes by cluster
    const clusterGroups: Record<string, typeof graph.nodes> = {};
    graph.nodes.forEach(node => {
        const cluster = nodeClusters.get(node.id) || 0;
        if (!clusterGroups[cluster]) {
            clusterGroups[cluster] = [];
        }
        clusterGroups[cluster].push(node);
    });

    // Generate cluster names
    const clusterNames: Record<string, string> = {};
    Object.entries(clusterGroups).forEach(([cluster]) => {
        const clusterIndex = Number(cluster);
        if (clusterIndex === 0) {
            // Main cluster (entry points) named after the file
            clusterNames[cluster] = "Main";
        } else {
            // Other clusters just use letters
            const letter = String.fromCharCode(64 + clusterIndex); // 65 is ASCII for 'A', but we start from 1
            clusterNames[cluster] = `Cluster ${letter}`;
        }
    });

    // Generate subgraphs for each cluster
    Object.entries(clusterGroups).forEach(([cluster, nodes]) => {
        const clusterIndex = Number(cluster);

        // Create subgraph
        diagram += `    subgraph Cluster_${clusterIndex}["${clusterNames[cluster]}"]\n`;

        // Add nodes
        nodes.forEach(node => {
            const id = node.id.replace(/[^a-zA-Z0-9]/g, '_');
            const nodeId = `${id}_${node.functionType || 'regular'}`;

            // Get just the function name without parameters
            let label = node.label.split('(')[0];

            // Escape any markdown characters in labels
            label = label
                .replace(/"/g, '\'')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\*/g, '\\*')
                .replace(/\+/g, '\\+')
                .replace(/\-/g, '\\-')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]');

            // Use different node shapes based on function type
            if (node.type === 'entry') {
                diagram += `        ${nodeId}(["${label}"])\n`;
            } else if (node.type === 'external') {
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
            label = `(${targetNode.parameters.join(', ')})`;
        }

        // Escape any markdown characters in labels
        label = label
            .replace(/"/g, '\'')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*/g, '\\*')
            .replace(/\+/g, '\\+')
            .replace(/\-/g, '\\-')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');

        // Check if this is a cross-cluster edge
        const fromCluster = nodeClusters.get(edge.from) || 0;
        const toCluster = nodeClusters.get(edge.to) || 0;

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

    // Apply styles to nodes
    graph.nodes.forEach(node => {
        const id = node.id.replace(/[^a-zA-Z0-9]/g, '_');
        const nodeId = `${id}_${node.functionType || 'regular'}`;
        const cluster = nodeClusters.get(node.id) || 0;
        diagram += `    class ${nodeId} cluster${cluster};\n`;
    });

    return diagram;
}

/**
 * Cluster nodes in the graph
 */
function clusterNodes(graph: ContractGraph): Map<string, number> {
    const nodeClusters = new Map<string, number>();
    let currentCluster = 0;

    // First, identify connected nodes
    const connectedNodes = new Set<string>();
    graph.edges.forEach(edge => {
        connectedNodes.add(edge.from);
        connectedNodes.add(edge.to);
    });

    // Group all isolated nodes into one cluster
    const isolatedNodes = graph.nodes
        .filter(node => !connectedNodes.has(node.id))
        .map(node => node.id);

    if (isolatedNodes.length > 0) {
        isolatedNodes.forEach(nodeId => {
            nodeClusters.set(nodeId, currentCluster);
        });
        currentCluster++;
    }

    // Process connected components
    const visited = new Set<string>();

    graph.nodes.forEach(node => {
        if (!visited.has(node.id) && connectedNodes.has(node.id)) {
            const component = findConnectedComponent(node.id, graph);
            component.forEach(nodeId => {
                nodeClusters.set(nodeId, currentCluster);
                visited.add(nodeId);
            });
            currentCluster++;
        }
    });

    return nodeClusters;
}

function findConnectedComponent(startNodeId: string, graph: ContractGraph): Set<string> {
    const component = new Set<string>();
    const queue = [startNodeId];

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (!component.has(nodeId)) {
            component.add(nodeId);

            // Add connected nodes through edges
            graph.edges.forEach(edge => {
                if (edge.from === nodeId && !component.has(edge.to)) {
                    queue.push(edge.to);
                }
                if (edge.to === nodeId && !component.has(edge.from)) {
                    queue.push(edge.from);
                }
            });
        }
    }

    return component;
}
