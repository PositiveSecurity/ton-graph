import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseMarlowe(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:contract|when)/);
}

export const marloweAdapter: LanguageAdapter = {
  fileExtensions: ['.marlowe'],
  parse(source: string): AST {
    return parseMarlowe(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default marloweAdapter;

export function parseMarloweContract(code: string): ContractGraph {
  const ast = parseMarlowe(code);
  return simpleAstToGraph(ast);
}
