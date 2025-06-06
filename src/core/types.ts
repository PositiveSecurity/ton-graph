export interface AST { /* generic */ }
export interface Edge { from: string; to: string; label?: string; }
export interface LanguageAdapter {
  readonly fileExtensions: string[];
  parse(source: string): AST;
  buildCallGraph(ast: AST): Edge[];
}
