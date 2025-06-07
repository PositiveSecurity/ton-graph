import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseRholang(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:contract)/);
}

export const rholangAdapter: LanguageAdapter = {
  fileExtensions: ['.rho'],
  parse(source: string): AST {
    return parseRholang(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default rholangAdapter;

export function parseRholangContract(code: string): ContractGraph {
  const ast = parseRholang(code);
  return simpleAstToGraph(ast);
}
