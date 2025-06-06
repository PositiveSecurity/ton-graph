import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';

export function parseCadence(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:pub\s+fun|fun)/);
}

export const cadenceAdapter: LanguageAdapter = {
  fileExtensions: ['.cdc'],
  parse(source: string): AST {
    return parseCadence(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default cadenceAdapter;
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseCadenceContract(code: string): ContractGraph {
  const ast = parseCadence(code);
  return simpleAstToGraph(ast);
}
