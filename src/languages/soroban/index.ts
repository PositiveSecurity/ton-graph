import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseSoroban(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fn)/);
}

export const sorobanAdapter: LanguageAdapter = {
  fileExtensions: ['.soroban'],
  parse(source: string): AST {
    return parseSoroban(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default sorobanAdapter;

export function parseSorobanContract(code: string): ContractGraph {
  const ast = parseSoroban(code);
  return simpleAstToGraph(ast);
}
