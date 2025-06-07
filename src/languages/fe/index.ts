import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseFe(source: string): SimpleAST {
  return parseSimpleFunctions(source, /fn/);
}

export const feAdapter: LanguageAdapter = {
  fileExtensions: ['.fe'],
  parse(source: string): AST {
    return parseFe(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default feAdapter;

export function parseFeContract(code: string): ContractGraph {
  const ast = parseFe(code);
  return simpleAstToGraph(ast);
}
