import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseBamboo(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:function)/);
}

export const bambooAdapter: LanguageAdapter = {
  fileExtensions: ['.bamboo'],
  parse(source: string): AST {
    return parseBamboo(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default bambooAdapter;

export function parseBambooContract(code: string): ContractGraph {
  const ast = parseBamboo(code);
  return simpleAstToGraph(ast);
}
