import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseGlow(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fun|function)/);
}

export const glowAdapter: LanguageAdapter = {
  fileExtensions: ['.glow'],
  parse(source: string): AST {
    return parseGlow(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default glowAdapter;

export function parseGlowContract(code: string): ContractGraph {
  const ast = parseGlow(code);
  return simpleAstToGraph(ast);
}
