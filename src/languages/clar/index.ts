import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseClar(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fn|function|def|define)/);
}

export const clarAdapter: LanguageAdapter = {
  fileExtensions: ['.clar'],
  parse(source: string): AST {
    return parseClar(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default clarAdapter;

export function parseClarContract(code: string): ContractGraph {
  const ast = parseClar(code);
  return simpleAstToGraph(ast);
}
