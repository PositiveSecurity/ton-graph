import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseLeo(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:function|fn)/);
}

export const leoAdapter: LanguageAdapter = {
  fileExtensions: ['.leo'],
  parse(source: string): AST {
    return parseLeo(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default leoAdapter;

export function parseLeoContract(code: string): ContractGraph {
  const ast = parseLeo(code);
  return simpleAstToGraph(ast);
}
