import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseSophia(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:entrypoint|function)/);
}

export const sophiaAdapter: LanguageAdapter = {
  fileExtensions: ['.aes'],
  parse(source: string): AST {
    return parseSophia(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default sophiaAdapter;

export function parseSophiaContract(code: string): ContractGraph {
  const ast = parseSophia(code);
  return simpleAstToGraph(ast);
}
