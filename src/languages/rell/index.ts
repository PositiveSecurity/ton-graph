import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseRell(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:function|fn)/);
}

export const rellAdapter: LanguageAdapter = {
  fileExtensions: ['.rell'],
  parse(source: string): AST {
    return parseRell(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default rellAdapter;

export function parseRellContract(code: string): ContractGraph {
  const ast = parseRell(code);
  return simpleAstToGraph(ast);
}
