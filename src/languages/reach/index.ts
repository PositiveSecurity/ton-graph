import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseReach(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:function|fun)/);
}

export const reachAdapter: LanguageAdapter = {
  fileExtensions: ['.reach'],
  parse(source: string): AST {
    return parseReach(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default reachAdapter;

export function parseReachContract(code: string): ContractGraph {
  const ast = parseReach(code);
  return simpleAstToGraph(ast);
}
