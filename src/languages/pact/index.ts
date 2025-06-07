import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parsePact(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:defun|defpact|defcap)/);
}

export const pactAdapter: LanguageAdapter = {
  fileExtensions: ['.pact'],
  parse(source: string): AST {
    return parsePact(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default pactAdapter;

export function parsePactContract(code: string): ContractGraph {
  const ast = parsePact(code);
  return simpleAstToGraph(ast);
}
