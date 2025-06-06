import { parse } from '../../move-analyzer/parser';
import { AST, Edge, LanguageAdapter } from '../../core/types';

export const movelangAdapter: LanguageAdapter = {
  fileExtensions: ['.move'],
  parse(source: string): AST {
    return parse(source);        // full AST
  },
  buildCallGraph(ast: AST): Edge[] {
    const edges: Edge[] = [];
    const funcs = new Map<string, any>();
    const a = ast as any;

    // 1️⃣ collect all function declarations
    a.functions.forEach((fn: any) => funcs.set(fn.name, fn));

    // 2️⃣ walk bodies and record call expressions
    a.functions.forEach((fn: any) => {
      fn.body.replace(/(\w+)\s*\(/g, (m: string, name: string) => {
        if (funcs.has(name)) {
          edges.push({ from: fn.name, to: name });
        }
        return m;
      });
    });
    return edges;
  }
};
export default movelangAdapter;
