export interface SimpleFunction {
  name: string;
  body: string;
}

export interface SimpleAST {
  functions: SimpleFunction[];
}

export function parseSimpleFunctions(code: string, keyword: string | RegExp = /(?:fun|function|func|def)/): SimpleAST {
  const keywordSource = typeof keyword === 'string' ? keyword : keyword.source;
  const regex = new RegExp(`${keywordSource}\\s+([A-Za-z_][\\w]*)\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\}`, 'g');
  const functions: SimpleFunction[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code)) !== null) {
    functions.push({ name: match[1], body: match[2] });
  }
  return { functions };
}

export function buildSimpleEdges(ast: SimpleAST): { from: string; to: string }[] {
  const edges: { from: string; to: string }[] = [];
  const edgeSet = new Set<string>();
  const names = ast.functions.map(f => f.name);
  if (names.length === 0) return edges;
  const callRegex = new RegExp(`\\b(${names.join('|')})\\s*\\(`, 'g');
  for (const fn of ast.functions) {
    let m: RegExpExecArray | null;
    while ((m = callRegex.exec(fn.body)) !== null) {
      const to = m[1];
      const key = `${fn.name}->${to}`;
      if (to !== fn.name && names.includes(to) && !edgeSet.has(key)) {
        edges.push({ from: fn.name, to });
        edgeSet.add(key);
      }
    }
    callRegex.lastIndex = 0;
  }
  return edges;
}
import { ContractGraph } from '../types/graph';
import { GraphNodeKind } from '../types/graphNodeKind';

export function simpleAstToGraph(ast: SimpleAST): ContractGraph {
  const graph: ContractGraph = { nodes: [], edges: [] };
  for (const fn of ast.functions) {
    graph.nodes.push({
      id: fn.name,
      label: `${fn.name}()`,
      type: GraphNodeKind.Function,
      contractName: 'Contract',
      parameters: [],
      functionType: 'regular'
    });
  }
  const edges = buildSimpleEdges(ast);
  graph.edges.push(...edges.map(e => ({ ...e, label: '' })));
  return graph;
}
