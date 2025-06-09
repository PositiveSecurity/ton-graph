import * as vscode from 'vscode';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('ton-graph');

export function reportDiagnostic(uri: vscode.Uri, message: string, line = 0, column = 0): void {
  const range = new vscode.Range(line, column, line, column + 1);
  const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
  diagnosticCollection.set(uri, [diagnostic]);
}

export function clearDiagnostics(uri: vscode.Uri): void {
  diagnosticCollection.delete(uri);
}

