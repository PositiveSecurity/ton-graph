import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseScilla(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:transition|procedure|function|def)/);
}

export const scillaAdapter: LanguageAdapter = {
  fileExtensions: ['.scilla'],
  parse(source: string): AST {
    return parseScilla(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default scillaAdapter;

export function parseScillaContract(code: string): ContractGraph {
  const ast = parseScilla(code);
  return simpleAstToGraph(ast);
}
