import { AST, Edge, LanguageAdapter } from '../../types/core';
import { SimpleAST, buildSimpleEdges, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseHuff(source: string): SimpleAST {
  const regex = /#define\s+macro\s+([A-Za-z_][\w]*)\s*\([^)]*\)[^{]*\{([\s\S]*?)\}/g;
  const functions: { name: string; body: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    functions.push({ name: match[1], body: match[2] });
  }
  return { functions };
}

export const huffAdapter: LanguageAdapter = {
  fileExtensions: ['.huff'],
  parse(source: string): AST {
    return parseHuff(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default huffAdapter;

export function parseHuffContract(code: string): ContractGraph {
  const ast = parseHuff(code);
  return simpleAstToGraph(ast);
}
