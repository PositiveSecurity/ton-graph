import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseYul(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:function)/);
}

export const yulAdapter: LanguageAdapter = {
  fileExtensions: ['.yul'],
  parse(source: string): AST {
    return parseYul(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default yulAdapter;

export function parseYulContract(code: string): ContractGraph {
  const ast = parseYul(code);
  return simpleAstToGraph(ast);
}
