import { parseMove, MoveAST } from '@parser/move';
import { AST, Edge, LanguageAdapter } from '../../types/core';
import { walk } from '../../parser/sharedWalk';

export const movelangAdapter: LanguageAdapter = {
  fileExtensions: ['.move'],
  parse(source: string): AST {
    return parseMove(source).ast as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    const edges: Edge[] = [];
    const a = ast as unknown as MoveAST;
    const funcs = new Map<string, { module: string; name: string; body?: any }>();

    for (const m of a.modules) {
      for (const f of m.functions) {
        funcs.set(`${m.name}::${f.name}`, { module: m.name, name: f.name, body: f.body });
      }
    }

    for (const m of a.modules) {
      const useMap = new Map<string, string>();
      m.uses.forEach(u => useMap.set(u.alias, u.path));
      for (const f of m.functions) {
        if (!f.body) continue;
        const from = `${m.name}::${f.name}`;
        for (const call of walk(f.body, 'call_expression')) {
          const access = call.namedChildren[0]?.namedChildren?.find((c: any) => c.fieldName === 'access') || call.childForFieldName('access');
          let path = access ? access.text : '';
          if (!path) continue;
          if (!path.includes('::')) {
            path = useMap.get(path) || `${m.name}::${path}`;
          }
          const to = path;
          if (funcs.has(to)) {
            edges.push({ from, to });
          }
        }
      }
    }
    return edges;
  }
};
export default movelangAdapter;
