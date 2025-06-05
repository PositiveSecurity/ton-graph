import * as vscode from 'vscode';
import { createVisualizationPanel } from '../visualization/visualizer';
import { handleExport } from '../export/exportHandler';
import { ContractGraph } from '../types/graph';
import { detectLanguage, parseContractByLanguage, getFunctionTypeFilters } from '../parser/parserUtils';
import { logError } from '../logger';
import { applyFilters } from './filterUtils';

let panel: vscode.WebviewPanel | undefined;

export async function visualize(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
    let document: vscode.TextDocument;
    let code: string;

    if (fileUri) {
        try {
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            code = Buffer.from(fileData).toString('utf8');
            document = await vscode.workspace.openTextDocument(fileUri);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Could not read file: ${error.message || String(error)}`);
            return;
        }
    } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        document = editor.document;
        code = document.getText();
    }

    let originalGraph: ContractGraph | null = null;

    try {
        const language = detectLanguage(document.fileName);
        originalGraph = await parseContractByLanguage(code, language);

        if (panel) {
            panel.dispose();
        }

        panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language));

        panel.onDidDispose(() => {
            panel = undefined;
        }, null, context.subscriptions);

        panel!.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'applyFilters') {
                    if (!originalGraph) {
                        logError('Original graph data not available for filtering');
                        vscode.window.showErrorMessage('Cannot apply filters: original graph data is missing.');
                        return;
                    }
                    const selectedTypes = message.selectedTypes as string[];
                    const nameFilter = message.nameFilter ? message.nameFilter.trim().toLowerCase() : '';
                    applyFilters(panel!, originalGraph, selectedTypes, nameFilter);

                } else {
                    await handleExport(panel!, message, context);
                }
            },
            undefined,
            context.subscriptions
        );

        panel!.reveal(vscode.ViewColumn.Beside);
    } catch (error: any) {
        logError('Error visualizing contract', error);
        vscode.window.showErrorMessage(`Error visualizing contract: ${error.message || String(error)}`);
        originalGraph = null;
    }
}
