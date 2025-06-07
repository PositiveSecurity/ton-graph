import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseScrypto(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fn)/);
}

export const scryptoAdapter: LanguageAdapter = {
  fileExtensions: ['.rs', '.scrypto'],
  parse(source: string): AST {
    return parseScrypto(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default scryptoAdapter;

export function parseScryptoContract(code: string): ContractGraph {
  const ast = parseScrypto(code);
  return simpleAstToGraph(ast);
}
