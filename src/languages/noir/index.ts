import { AST, Edge, LanguageAdapter } from '../../types/core';
import { ContractGraph } from '../../types/graph';
import { parseNoir as parseNoirSource, NoirAST, noirAstToGraph, parseNoirContract as parseNoirContractParser } from '../../parser/noirParser';

export function parseNoir(source: string): NoirAST {
  return parseNoirSource(source).ast;
}

export const noirAdapter: LanguageAdapter = {
  fileExtensions: ['.nr', '.noir'],
  parse(source: string): AST {
    return parseNoirSource(source).ast as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    const graph = noirAstToGraph(ast as unknown as NoirAST);
    return graph.edges;
  }
};
export default noirAdapter;

export function parseNoirContract(code: string): ContractGraph {
  return parseNoirContractParser(code);
}
