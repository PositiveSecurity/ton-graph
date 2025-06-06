import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';

export function parseCairo(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:func|fn)/);
}

export const cairoAdapter: LanguageAdapter = {
  fileExtensions: ['.cairo'],
  parse(source: string): AST {
    return parseCairo(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default cairoAdapter;
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseCairoContract(code: string): ContractGraph {
  const ast = parseCairo(code);
  return simpleAstToGraph(ast);
}
