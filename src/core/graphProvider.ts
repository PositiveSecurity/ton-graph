import * as vscode from 'vscode';
import { LanguageAdapter, AST } from './types';

export class GraphProvider implements vscode.DocumentSymbolProvider {
  constructor(private adapter: LanguageAdapter) {}

  provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const ast = this.adapter.parse(document.getText()) as any;
    if (!('functions' in ast)) {
      return [];
    }
    const symbols: vscode.DocumentSymbol[] = [];
    (ast as any).functions.forEach((fn: any) => {
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
