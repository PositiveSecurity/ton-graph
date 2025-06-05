import * as vscode from 'vscode';
import { ContractGraph } from '../types/graph';
import { generateMermaidDiagram } from '../visualization/visualizer';
import logger from '../logging/logger';

export function applyFilters(
    panel: vscode.WebviewPanel,
    originalGraph: ContractGraph,
    selectedTypes: string[],
    nameFilter: string
) {
    try {
        const normalizedNameFilter = nameFilter ? nameFilter.trim().toLowerCase() : '';

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

        if (normalizedNameFilter) {
            const matchingNodeIds = new Set<string>();
            const nameMatchedNodes = nodesPassingTypeFilter.filter(node => {
                const label = node.label.toLowerCase();
                const id = node.id.toLowerCase();
                if (label.includes(normalizedNameFilter) || id.includes(normalizedNameFilter)) {
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

        panel.webview.postMessage({
            command: 'updateDiagram',
            diagram: newMermaidDiagram,
        });
    } catch (filterError: any) {
        logger.error('Error applying filters', filterError);
        vscode.window.showErrorMessage(`Error applying filters: ${filterError.message || String(filterError)}`);
        panel.webview.postMessage({
            command: 'filterError',
            error: filterError.message || String(filterError),
        });
    }
}
