import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST, simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseNoir(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fn)/);
}

export const noirAdapter: LanguageAdapter = {
  fileExtensions: ['.nr', '.noir'],
  parse(source: string): AST {
    return parseNoir(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default noirAdapter;

export function parseNoirContract(code: string): ContractGraph {
  const ast = parseNoir(code);
  return simpleAstToGraph(ast);
}
