import * as vscode from 'vscode';

export const outputChannel = vscode.window.createOutputChannel('TON Graph');

export function logError(message: string, err?: unknown): void {
    const details = err ? (err instanceof Error ? err.message : String(err)) : '';
    const formatted = details ? `${message}: ${details}` : message;
    outputChannel.appendLine(formatted);
}
