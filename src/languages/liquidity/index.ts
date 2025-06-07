import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseLiquidity(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:let)/);
}

export const liquidityAdapter: LanguageAdapter = {
  fileExtensions: ['.liq'],
  parse(source: string): AST {
    return parseLiquidity(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default liquidityAdapter;

export function parseLiquidityContract(code: string): ContractGraph {
  const ast = parseLiquidity(code);
  return simpleAstToGraph(ast);
}
