import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseFlint(source: string): SimpleAST {
  return parseSimpleFunctions(source, /fun/);
}

export const flintAdapter: LanguageAdapter = {
  fileExtensions: ['.flint'],
  parse(source: string): AST {
    return parseFlint(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default flintAdapter;

export function parseFlintContract(code: string): ContractGraph {
  const ast = parseFlint(code);
  return simpleAstToGraph(ast);
}
