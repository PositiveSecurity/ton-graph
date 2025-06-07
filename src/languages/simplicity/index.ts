import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseSimplicity(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fun)/);
}

export const simplicityAdapter: LanguageAdapter = {
  fileExtensions: ['.simp'],
  parse(source: string): AST {
    return parseSimplicity(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default simplicityAdapter;

export function parseSimplicityContract(code: string): ContractGraph {
  const ast = parseSimplicity(code);
  return simpleAstToGraph(ast);
}
