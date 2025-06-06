import { AST, Edge, LanguageAdapter } from '../../core/types';
import { parseContractCode } from './funcParser';
import { parseTactContract } from './tactParser';
import { parseTolkContract } from './tolkParser';

const funcAdapter: LanguageAdapter = {
  fileExtensions: ['.fc', '.func'],
  parse(source: string): AST {
    return parseContractCode(source) as unknown as AST;
  },
  buildCallGraph(ast: any): Edge[] {
    return ((ast as any).edges || []).map((e: any) => ({ from: e.from, to: e.to, label: e.label }));
  }
};

const tactAdapter: LanguageAdapter = {
  fileExtensions: ['.tact'],
  parse(source: string): AST {
    return parseTactContract(source) as unknown as AST;
  },
  buildCallGraph(ast: any): Edge[] {
    return ((ast as any).edges || []).map((e: any) => ({ from: e.from, to: e.to, label: e.label }));
  }
};

const tolkAdapter: LanguageAdapter = {
  fileExtensions: ['.tolk'],
  parse(source: string): AST {
    return parseTolkContract(source) as unknown as AST;
  },
  buildCallGraph(ast: any): Edge[] {
    return ((ast as any).edges || []).map((e: any) => ({ from: e.from, to: e.to, label: e.label }));
  }
};

export { funcAdapter, tactAdapter, tolkAdapter };
export default [funcAdapter, tactAdapter, tolkAdapter];
