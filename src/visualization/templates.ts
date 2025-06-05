export { generateVisualizationHtml } from "./htmlTemplate";
// generateErrorHtml remains useful for displaying initialization errors
export function generateErrorHtml(message: string, mermaidScriptUri?: string): string {
    // Use error styles from "Copy"
    const escapedMessage = message.replace(/</g, "<").replace(/>/g, ">");
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TON Graph - Error</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                padding: 20px;
                background-color: #f5f5f5; /* Background from copy */
            }
            .container {
                max-width: 800px;
                margin: auto;
                background: white; /* Background from copy */
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
                 color: #d32f2f; /* Error title color */
                 margin-top: 0;
            }
            .error {
                 /* Error box style from copy */
                color: #721c24;
                background-color: #f8d7da;
                padding: 15px;
                border-radius: 5px;
                border: 1px solid #f5c6cb; /* Added border for definition */
                white-space: pre-wrap;
                word-wrap: break-word;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Error Occurred</h1>
            <div class="error">${escapedMessage}</div>
             ${mermaidScriptUri ? '<!-- Mermaid script was available but not used on error page -->' : ''}
        </div>
    </body>
    </html>
`;
}

// Helper function to determine if a node should be hidden
function shouldHideNode(
    nodeId: string,
    hiddenNodes: Set<string>,
    nameFilter: string | undefined,
    matchingNodes: Set<string>,
    connectedNodes: Set<string>
): boolean {
    // If type filtering is hiding this node
    if (hiddenNodes.has(nodeId)) return true;

    // If no name filter, keep the node
    if (!nameFilter || nameFilter.length === 0) return false;

    // If name filter is active, only show matching and connected nodes
    return !matchingNodes.has(nodeId) && !connectedNodes.has(nodeId);
}

// Helper function to get node type from node ID
function getNodeType(nodeId: string): string | null {
    // Extract function type from node ID (format: nodeId_functionType)
    const parts = nodeId.split('_');
    if (parts.length > 1) {
        const type = parts[parts.length - 1];
        // Check if the type is one of our known function types
        if (['impure', 'inline', 'method_id', 'regular'].includes(type)) {
            return type;
        }
    }
    return null;
}

// Helper function to extract node name by removing type suffix
function extractNodeName(nodeId: string): string {
    const parts = nodeId.split('_');
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (['impure', 'inline', 'method_id', 'regular'].includes(lastPart)) {
            // Remove the type suffix
            return parts.slice(0, -1).join('_');
        }
    }
    return nodeId;
}

// Helper function to remove HTML entities from diagram code for better parsing
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&#95;/g, '_')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
}

// Function to filter the Mermaid diagram based on selected types
interface ParsedDiagram {
    lines: string[];
    originalLines: string[];
    graphDefinition: string;
    graphDefLineIndex: number;
}

interface ParsedInfo {
    hiddenNodes: Set<string>;
    nodeLabels: Map<string, string>;
    edgeConnections: Map<string, Set<string>>;
    allNodeIds: Map<string, string>;
    clusterNodes: Map<string, Set<string>>;
    nodeToCluster: Map<string, string>;
    clusterDefinitions: Map<string, string>;
    originalNodeLines: Map<string, string>;
}

function parseMermaidDiagram(diagram: string): ParsedDiagram {
    const lines = diagram.split("\n").map(line => decodeHtmlEntities(line));
    const originalLines = [...lines];
    const graphDefLineIndex = lines.findIndex(line => line.trim().startsWith("graph ") || line.trim().startsWith("flowchart "));
    const graphDefinition = graphDefLineIndex !== -1 ? lines[graphDefLineIndex] : "graph TB;";
    return { lines, originalLines, graphDefinition, graphDefLineIndex };
}

function filterNodesByType(parsed: ParsedDiagram, selectedTypes: string[]): string[] {
    const { lines, graphDefLineIndex, graphDefinition } = parsed;
    const result: string[] = [graphDefinition];
    for (let i = 0; i < lines.length; i++) {
        if (i === graphDefLineIndex) continue;
        const line = lines[i];
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("graph ") || trimmedLine.startsWith("flowchart ")) continue;
        if (line.includes("subgraph ") || line.includes("classDef ") || line.includes("class ") || line.includes("end") || line.includes("-->")) {
            result.push(line);
            continue;
        }
        if (line.includes("[") && line.includes("]")) {
            const nodeId = line.split("[")[0].trim();
            const nodeType = getNodeType(nodeId);
            if (nodeType && !selectedTypes.includes(nodeType)) {
                continue;
            }
            result.push(line);
            continue;
        }
        result.push(line);
    }
    return result;
}

function parseDiagram(parsed: ParsedDiagram, selectedTypes: string[]): ParsedInfo {
    const { lines, graphDefLineIndex, originalLines } = parsed;
    const info: ParsedInfo = {
        hiddenNodes: new Set(),
        nodeLabels: new Map(),
        edgeConnections: new Map(),
        allNodeIds: new Map(),
        clusterNodes: new Map(),
        nodeToCluster: new Map(),
        clusterDefinitions: new Map(),
        originalNodeLines: new Map()
    };

    const getBaseNodeId = (fullNodeId: string): string => {
        const parts = fullNodeId.split('_');
        if (["impure","inline","method_id","regular"].includes(parts[parts.length - 1])) {
            return parts.slice(0, -1).join('_');
        }
        return fullNodeId;
    };

    let currentCluster = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === graphDefLineIndex) continue;
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('graph ') || trimmedLine.startsWith('flowchart ')) continue;
        if (trimmedLine.startsWith('subgraph ')) {
            currentCluster = trimmedLine.split('subgraph ')[1].split('[')[0].trim();
            if (!info.clusterNodes.has(currentCluster)) {
                info.clusterNodes.set(currentCluster, new Set());
            }
            continue;
        }
        if (trimmedLine === 'end') {
            currentCluster = '';
            continue;
        }
        if (line.includes('[') && line.includes(']')) {
            let nodeId = '';
            const match = line.match(/([^\s\[]+)(\s*)\[/);
            if (match && match[1]) {
                nodeId = match[1].trim();
            } else {
                nodeId = line.split('[')[0].trim();
            }
            if (!nodeId) continue;
            const baseNodeId = getBaseNodeId(nodeId);
            info.allNodeIds.set(baseNodeId, nodeId);
            if (currentCluster) {
                info.clusterNodes.get(currentCluster)?.add(nodeId);
                info.nodeToCluster.set(nodeId, currentCluster);
            }
            const labelMatch = line.match(/\[(.*?)\]/);
            const nodeLabel = labelMatch ? labelMatch[1] : nodeId;
            info.nodeLabels.set(nodeId, nodeLabel);
            const nodeType = getNodeType(nodeId);
            if (nodeType && !selectedTypes.includes(nodeType)) {
                info.hiddenNodes.add(nodeId);
            }
        }
        if (line.includes('-->')) {
            let from = '', to = '';
            if (line.includes('-->|')) {
                const parts = line.split('-->|');
                if (parts.length >= 2) {
                    from = parts[0].trim();
                    const labelAndTarget = parts[1].split('|');
                    if (labelAndTarget.length >= 2) {
                        to = labelAndTarget[1].trim();
                    }
                }
            } else {
                const parts = line.split('-->');
                if (parts.length >= 2) {
                    from = parts[0].trim();
                    to = parts[1].trim();
                }
            }
            if (from && to) {
                if (!info.edgeConnections.has(from)) info.edgeConnections.set(from, new Set());
                info.edgeConnections.get(from)!.add(to);
                if (!info.edgeConnections.has(to)) info.edgeConnections.set(to, new Set());
                info.edgeConnections.get(to)!.add(from);
            }
        }
    }

    for (const line of originalLines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('graph ') || trimmedLine.startsWith('flowchart ')) continue;
        if (trimmedLine.startsWith('subgraph ')) {
            const clusterId = trimmedLine.split('subgraph ')[1].split('[')[0].trim();
            info.clusterDefinitions.set(clusterId, line);
        }
        if (line.includes('[') && line.includes(']')) {
            let nodeId = '';
            const match = line.match(/([^\s\[]+)(\s*)\[/);
            if (match && match[1]) {
                nodeId = match[1].trim();
            } else {
                nodeId = line.split('[')[0].trim();
            }
            if (nodeId) {
                info.originalNodeLines.set(nodeId, line);
            }
        }
    }

    return info;
}

function determineVisibleNodes(info: ParsedInfo, nameFilter: string): Set<string> {
    const visibleNodes = new Set<string>();
    const lowerFilter = nameFilter.toLowerCase();
    const directMatches = new Set<string>();

    for (const [nodeId, nodeLabel] of info.nodeLabels.entries()) {
        if (info.hiddenNodes.has(nodeId)) continue;
        if (nodeLabel.toLowerCase().includes(lowerFilter)) {
            directMatches.add(nodeId);
            visibleNodes.add(nodeId);
        }
    }

    if (directMatches.size === 0) {
        for (const [baseNodeId, fullNodeId] of info.allNodeIds.entries()) {
            if (info.hiddenNodes.has(fullNodeId)) continue;
            if (baseNodeId.toLowerCase().includes(lowerFilter)) {
                directMatches.add(fullNodeId);
                visibleNodes.add(fullNodeId);
            }
        }
    }

    for (const matchingNodeId of directMatches) {
        const connectedIds = info.edgeConnections.get(matchingNodeId) || new Set<string>();
        for (const connectedId of connectedIds) {
            if (!info.hiddenNodes.has(connectedId)) {
                visibleNodes.add(connectedId);
            }
        }
    }
    return visibleNodes;
}

function buildDiagramLines(parsed: ParsedDiagram, info: ParsedInfo, visibleNodes: Set<string>): string[] {
    const { graphDefinition, originalLines } = parsed;
    const newDiagram: string[] = [graphDefinition];
    const processedClusters = new Set<string>();

    for (const [clusterId, nodeSet] of info.clusterNodes.entries()) {
        const visibleNodesInCluster = Array.from(nodeSet).filter(nodeId => visibleNodes.has(nodeId));
        if (visibleNodesInCluster.length > 0) {
            const clusterDefLine = info.clusterDefinitions.get(clusterId);
            if (clusterDefLine) {
                newDiagram.push(clusterDefLine);
                processedClusters.add(clusterId);
                for (const nodeId of visibleNodesInCluster) {
                    const nodeLine = info.originalNodeLines.get(nodeId);
                    if (nodeLine) newDiagram.push(nodeLine);
                }
                newDiagram.push('end');
            }
        }
    }

    const remainingNodes = Array.from(visibleNodes).filter(nodeId => !info.nodeToCluster.has(nodeId) || !processedClusters.has(info.nodeToCluster.get(nodeId) || ''));
    for (const nodeId of remainingNodes) {
        const nodeLine = info.originalNodeLines.get(nodeId);
        if (nodeLine) newDiagram.push(nodeLine);
    }

    const addedEdges = new Set<string>();
    for (const line of originalLines) {
        if (line.includes('-->')) {
            let from = '', to = '';
            if (line.includes('-->|')) {
                const parts = line.split('-->|');
                if (parts.length >= 2) {
                    from = parts[0].trim();
                    const labelAndTarget = parts[1].split('|');
                    if (labelAndTarget.length >= 2) {
                        to = labelAndTarget[1].trim();
                    }
                }
            } else if (line.includes('-->')) {
                const parts = line.split('-->');
                if (parts.length >= 2) {
                    from = parts[0].trim();
                    to = parts[1].trim();
                }
            }
            if (from && to && visibleNodes.has(from) && visibleNodes.has(to)) {
                const edgeKey = `${from} --> ${to} `;
                if (!addedEdges.has(edgeKey)) {
                    newDiagram.push(line);
                    addedEdges.add(edgeKey);
                }
            }
        }
    }

    const classDefLines: string[] = [];
    const classAssignLines: string[] = [];
    for (const line of originalLines) {
        if (line.includes('classDef ')) {
            classDefLines.push(line);
        } else if (line.startsWith('class ')) {
            const parts = line.split(' ');
            if (parts.length >= 2) {
                const nodeId = parts[1];
                if (visibleNodes.has(nodeId)) {
                    classAssignLines.push(line);
                }
            }
        }
    }
    newDiagram.push(...classDefLines);
    newDiagram.push(...classAssignLines);
    return newDiagram;
}

function filterByName(parsed: ParsedDiagram, selectedTypes: string[], nameFilter: string): string[] {
    const info = parseDiagram(parsed, selectedTypes);
    const visibleNodes = determineVisibleNodes(info, nameFilter);
    return buildDiagramLines(parsed, info, visibleNodes);
}
export function filterMermaidDiagram(diagram: string, selectedTypes: string[], nameFilter?: string): string {
    if (!selectedTypes || selectedTypes.length === 0) {
        selectedTypes = ["impure", "inline", "method_id", "regular"];
    }
    if (!diagram) {
        return diagram || "";
    }
    try {
        const parsed = parseMermaidDiagram(diagram);
        let lines: string[];
        if (!nameFilter || nameFilter.trim().length === 0) {
            lines = filterNodesByType(parsed, selectedTypes);
        } else {
            lines = filterByName(parsed, selectedTypes, nameFilter);
        }
        const result = lines.join("\n");
        return validateAndFixDiagram(result);
    } catch (error) {
        console.error("Error in filterMermaidDiagram:", error);
        return diagram;
    }
}
// Helper function to validate and fix Mermaid diagram syntax
function validateAndFixDiagram(diagramCode: string): string {
    try {
        const lines = diagramCode.split('\\n');
        const cleanedLines = [];
        let graphDirectiveFound = false;
        let inSubgraph = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Handle graph directive - ensure it's only included once at the beginning
            if (line.startsWith('graph ') || line.startsWith('flowchart ')) {
                if (!graphDirectiveFound) {
                    cleanedLines.push(lines[i]); // Keep original whitespace
                    graphDirectiveFound = true;
                } else {
                }
                continue;
            }

            // Track subgraph state
            if (line.startsWith('subgraph ')) {
                inSubgraph = true;
            } else if (line === 'end') {
                inSubgraph = false;
            }

            // If we find another graph directive inside a subgraph, that's the problem
            // We'll remove it while keeping the rest of the line
            if (inSubgraph && line.includes('graph ')) {
                const fixedLine = lines[i].replace(/graph\s+(TB|LR|RL|BT|TD);?/g, '').trim();
                if (fixedLine) {
                    cleanedLines.push(fixedLine);
                }
            } else {
                cleanedLines.push(lines[i]); // Keep original line with whitespace
            }
        }

        // Ensure we have a graph directive
        if (!graphDirectiveFound) {
            cleanedLines.unshift('graph TB;');
        }

        return cleanedLines.join('\\n');
    } catch (error) {
        console.error("Error in validateAndFixDiagram:", error);
        return diagramCode; // Return original on validation error
    }
}
