import * as vscode from 'vscode';

export class Logger {
    private channel: vscode.OutputChannel;
    private diagnostics: vscode.DiagnosticCollection;
    private diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

    constructor() {
        this.channel = vscode.window.createOutputChannel('TON Graph Logs');
        this.diagnostics = vscode.languages.createDiagnosticCollection('ton-graph');
    }

    info(message: string, uri?: vscode.Uri) {
        const timestamp = new Date().toISOString();
        this.channel.appendLine(`[INFO ${timestamp}] ${message}`);
        if (uri) {
            this.addDiagnostic(uri, message, vscode.DiagnosticSeverity.Information);
        }
    }

    error(message: string, uri?: vscode.Uri) {
        const timestamp = new Date().toISOString();
        this.channel.appendLine(`[ERROR ${timestamp}] ${message}`);
        if (uri) {
            this.addDiagnostic(uri, message, vscode.DiagnosticSeverity.Error);
        }
    }

    clear(uri?: vscode.Uri) {
        if (uri) {
            this.diagnostics.delete(uri);
            this.diagnosticsMap.delete(uri.toString());
        } else {
            this.diagnostics.clear();
            this.diagnosticsMap.clear();
        }
    }

    private addDiagnostic(uri: vscode.Uri, message: string, severity: vscode.DiagnosticSeverity) {
        const diag = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), message, severity);
        const key = uri.toString();
        const arr = this.diagnosticsMap.get(key) || [];
        arr.push(diag);
        this.diagnosticsMap.set(key, arr);
        this.diagnostics.set(uri, arr);
    }
}

export const logger = new Logger();
