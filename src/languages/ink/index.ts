import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseInk(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fn)/);
}

export const inkAdapter: LanguageAdapter = {
  fileExtensions: ['.ink'],
  parse(source: string): AST {
    return parseInk(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default inkAdapter;

export function parseInkContract(code: string): ContractGraph {
  const ast = parseInk(code);
  return simpleAstToGraph(ast);
}
