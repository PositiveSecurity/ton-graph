import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseLigo(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:function|let)/);
}

export const ligoAdapter: LanguageAdapter = {
  fileExtensions: ['.ligo', '.mligo', '.religo', '.jsligo'],
  parse(source: string): AST {
    return parseLigo(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default ligoAdapter;

export function parseLigoContract(code: string): ContractGraph {
  const ast = parseLigo(code);
  return simpleAstToGraph(ast);
}
