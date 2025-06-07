import * as vscode from "vscode";
import { LanguageAdapter, AST } from "../types/core";

const parseCache = new WeakMap<vscode.Uri, { version: number; ast: AST }>();

if (
  vscode.workspace &&
  typeof vscode.workspace.onDidChangeTextDocument === "function"
) {
  vscode.workspace.onDidChangeTextDocument((e) => {
    parseCache.delete(e.document.uri);
  });
}

export class GraphProvider implements vscode.DocumentSymbolProvider {
  constructor(private adapter: LanguageAdapter) {}

  provideDocumentSymbols(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    let cached = parseCache.get(document.uri);
    let ast: AST;
    if (cached && cached.version === document.version) {
      ast = cached.ast;
    } else {
      ast = this.adapter.parse(document.getText());
      parseCache.set(document.uri, { version: document.version, ast });
    }
    const anyAst: any = ast;
    if (!("functions" in anyAst)) {
      return [];
    }
    const symbols: vscode.DocumentSymbol[] = [];
    anyAst.functions.forEach((fn: any) => {
      const start = fn.startPosition || { row: 0, column: 0 };
      const end = fn.endPosition || { row: 0, column: 0 };
      const range = new vscode.Range(
        start.row,
        start.column,
        end.row,
        end.column,
      );
      const symbol = new vscode.DocumentSymbol(
        fn.name,
        "",
        vscode.SymbolKind.Function,
        range,
        range,
      );
      symbols.push(symbol);
    });
    return symbols;
  }
}
