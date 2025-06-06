import { AST, Edge, LanguageAdapter } from '../../types/core';
import { parseSimpleFunctions, buildSimpleEdges, SimpleAST } from '../simple';

export function parseMichelson(source: string): SimpleAST {
  return parseSimpleFunctions(source, /(?:entrypoint\s+|func|function)/);
}

export const michelsonAdapter: LanguageAdapter = {
  fileExtensions: ['.tz'],
  parse(source: string): AST {
    return parseMichelson(source) as unknown as AST;
  },
  buildCallGraph(ast: AST): Edge[] {
    return buildSimpleEdges(ast as unknown as SimpleAST);
  }
};
export default michelsonAdapter;
import { simpleAstToGraph } from '../simple';
import { ContractGraph } from '../../types/graph';

export function parseMichelsonContract(code: string): ContractGraph {
  const ast = parseMichelson(code);
  return simpleAstToGraph(ast);
}
