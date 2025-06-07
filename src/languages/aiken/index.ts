import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseAiken(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fn)/);
}

export const aikenAdapter: LanguageAdapter = {
  fileExtensions: ['.ak', '.aiken'],
  parse(source: string): AST {
    return parseAiken(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default aikenAdapter;

export function parseAikenContract(code: string): ContractGraph {
  const ast = parseAiken(code);
  return simpleAstToGraph(ast);
}
