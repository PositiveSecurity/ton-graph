import { ContractGraph, ContractNode } from '../../types/graph';
import { GraphNodeKind } from '../../types/graphNodeKind';

export interface ParsedFunction {
    name: string;
    params: string;
    body: string;
    type: string;
}

export function buildFunctionGraph(functions: Map<string, ParsedFunction>, contractName: string): ContractGraph {
    const graph: ContractGraph = { nodes: [], edges: [] };

    // create nodes
    functions.forEach(fn => {
        const node: ContractNode = {
            id: fn.name,
            label: `${fn.name}(${fn.params})`,
            type: GraphNodeKind.Function,
            contractName,
            parameters: fn.params.split(',').map(p => p.trim()).filter(Boolean),
            functionType: fn.type
        };
        graph.nodes.push(node);
    });

    const names = Array.from(functions.keys());
    if (names.length === 0) {
        return graph;
    }
    const callRegex = new RegExp(`\\b(${names.join('|')})\\s*\\(`, 'g');

    // create edges
    for (const [from, fn] of functions) {
        const added = new Set<string>();
        let match: RegExpExecArray | null;
        while ((match = callRegex.exec(fn.body)) !== null) {
            const to = match[1];
            if (to !== from && functions.has(to) && !added.has(to)) {
                graph.edges.push({ from, to, label: '' });
                added.add(to);
            }
        }
        callRegex.lastIndex = 0;
    }

    return graph;
}
