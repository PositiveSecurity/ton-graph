import { parseMove } from '@parser/move';
import { ContractGraph, ContractNode } from '../../types/graph';
import { GraphNodeKind } from '../../types/graphNodeKind';

function walk(node: any, type: string): any[] {
  const res: any[] = [];
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (n.type === type) res.push(n);
    stack.push(...n.namedChildren);
  }
  return res;
}

export async function parseMoveContract(code: string): Promise<ContractGraph> {
  const { ast } = parseMove(code);
  const graph: ContractGraph = { nodes: [], edges: [] };
  const funcMap = new Map<string, ContractNode>();

  for (const m of ast.modules) {
    for (const f of m.functions) {
      const id = `${m.name}::${f.name}`;
      const node: ContractNode = {
        id,
        label: `${f.name}()`,
        type: GraphNodeKind.Function,
        contractName: m.name,
        parameters: [],
        functionType: f.isPublic ? 'public' : 'regular'
      };
      graph.nodes.push(node);
      funcMap.set(id, node);
    }
  }

  for (const m of ast.modules) {
    const useMap = new Map<string,string>();
    m.uses.forEach(u => useMap.set(u.alias, u.path));
    for (const f of m.functions) {
      if (!f.body) continue;
      const from = `${m.name}::${f.name}`;
      const calls = walk(f.body, 'call_expression');
      for (const call of calls) {
        const access = call.namedChildren[0]?.namedChildren?.find((c:any)=>c.fieldName==='access') || call.childForFieldName('access');
        let path = access ? access.text : '';
        if (!path) continue;
        if (!path.includes('::')) {
          path = useMap.get(path) || `${m.name}::${path}`;
        }
        const to = path;
        if (!funcMap.has(to)) {
          graph.nodes.push({ id: to, label: path, type: GraphNodeKind.Function, contractName: path.split('::')[path.split('::').length-2] || path, });
          funcMap.set(to, graph.nodes[graph.nodes.length-1]);
        }
        graph.edges.push({ from, to, label: '' });
      }
    }
  }

  return graph;
}
