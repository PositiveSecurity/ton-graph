import * as vscode from 'vscode';
import { LanguageAdapter, AST } from './types';

const parseCache = new WeakMap<vscode.Uri, { version: number; ast: AST }>();

if (vscode.workspace && typeof vscode.workspace.onDidChangeTextDocument === 'function') {
  vscode.workspace.onDidChangeTextDocument((e) => {
    parseCache.delete(e.document.uri);
  });
}

export class GraphProvider implements vscode.DocumentSymbolProvider {
  constructor(private adapter: LanguageAdapter) {}

  provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    let cached = parseCache.get(document.uri);
    let ast: AST;
    if (cached && cached.version === document.version) {
      ast = cached.ast;
    } else {
      ast = this.adapter.parse(document.getText());
      parseCache.set(document.uri, { version: document.version, ast });
    }
    const anyAst: any = ast;
    if (!('functions' in anyAst)) {
      return [];
    }
    const symbols: vscode.DocumentSymbol[] = [];
    anyAst.functions.forEach((fn: any) => {
      const symbol = new vscode.DocumentSymbol(
        fn.name,
        '',
        vscode.SymbolKind.Function,
        new vscode.Range(0, 0, 0, 0),
        new vscode.Range(0, 0, 0, 0)
      );
      symbols.push(symbol);
    });
    return symbols;
  }
}
