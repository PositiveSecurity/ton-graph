import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';

export function parsePlutus(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:fun|function|def)/);
}

export const plutusAdapter: LanguageAdapter = {
  fileExtensions: ['.plutus'],
  parse(source: string): AST {
    return parsePlutus(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default plutusAdapter;
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parsePlutusContract(code: string): ContractGraph {
  const ast = parsePlutus(code);
  return simpleAstToGraph(ast);
}
