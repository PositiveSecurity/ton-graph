import { parse } from '../../move-analyzer/parser';
import { ContractGraph, ContractNode } from '../../types/graph';
import { GraphNodeKind } from '../../types/graphNodeKind';

export async function parseMoveContract(code: string): Promise<ContractGraph> {
  const ast = parse(code) as any;
  const graph: ContractGraph = { nodes: [], edges: [] };

  ast.functions.forEach((fn: any) => {
    const node: ContractNode = {
      id: fn.name,
      label: `${fn.name}()`,
      type: GraphNodeKind.Function,
      contractName: 'Contract',
      parameters: [],
      functionType: 'regular'
    };
    graph.nodes.push(node);
  });

  ast.functions.forEach((fn: any) => {
    fn.body.replace(/(\w+)\s*\(/g, (m: string, name: string) => {
      if (ast.functions.find((f: any) => f.name === name)) {
        graph.edges.push({ from: fn.name, to: name, label: '' });
      }
      return m;
    });
  });
  return graph;
}
