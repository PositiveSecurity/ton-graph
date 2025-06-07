import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseTeal(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:sub)/);
}

export const tealAdapter: LanguageAdapter = {
  fileExtensions: ['.teal'],
  parse(source: string): AST {
    return parseTeal(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default tealAdapter;

export function parseTealContract(code: string): ContractGraph {
  const ast = parseTeal(code);
  return simpleAstToGraph(ast);
}
