import * as vscode from 'vscode';
import { createVisualizationPanel } from '../visualization/visualizer';
import { handleExport } from '../export/exportHandler';
import { ContractGraph } from '../types/graph';
import { detectLanguage, parseContractByLanguage, getFunctionTypeFilters } from '../parser/parserUtils';
import logger from '../logging/logger';
import { applyFilters } from './filterUtils';
import { reportDiagnostic, clearDiagnostics } from '../logging/diagnostics';

let panel: vscode.WebviewPanel | undefined;

export async function visualize(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
    logger.info(`visualize command started with ${fileUri?.fsPath ?? 'active editor'}`);
    let document: vscode.TextDocument;
    let code: string;

    if (fileUri) {
        try {
            logger.debug(`Reading file ${fileUri.fsPath}`);
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            code = Buffer.from(fileData).toString('utf8');
            document = await vscode.workspace.openTextDocument(fileUri);
        } catch (error: any) {
            const msg = `Could not read file: ${error.message || String(error)}`;
            vscode.window.showErrorMessage(msg);
            logger.error('Failed to read file', error);
            reportDiagnostic(fileUri, msg);
            return;
        }
    } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            const msg = 'No active editor found';
            vscode.window.showErrorMessage(msg);
            logger.error(msg);
            return;
        }
        document = editor.document;
        code = document.getText();
    }

    let originalGraph: ContractGraph | null = null;

    try {
        const language = detectLanguage(document.fileName);
        logger.debug(`Detected language ${language}`);
        originalGraph = await parseContractByLanguage(code, language, document.uri);
        logger.debug('Parsed contract to graph');
        clearDiagnostics(document.uri);

        if (panel) {
            panel.dispose();
        }

        panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language));
        logger.debug('Visualization panel created');

        panel.onDidDispose(() => {
            panel = undefined;
        }, null, context.subscriptions);

        panel!.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'applyFilters') {
                    if (!originalGraph) {
                        logger.error('Original graph data not available for filtering');
                        vscode.window.showErrorMessage('Cannot apply filters: original graph data is missing.');
                        return;
                    }
                    const selectedTypes = message.selectedTypes as string[];
                    const nameFilter = message.nameFilter ? message.nameFilter.trim().toLowerCase() : '';
                    logger.debug(`Applying filters types=${selectedTypes.join(',')} name=${nameFilter}`);
                    applyFilters(panel!, originalGraph, selectedTypes, nameFilter);

                } else {
                    logger.debug(`Handling export command ${message.command}`);
                    await handleExport(panel!, message, context);
                }
            },
            undefined,
            context.subscriptions
        );

        panel!.reveal(vscode.ViewColumn.Beside);
        logger.debug('Visualization panel revealed');
        logger.info('visualize command completed successfully');
    } catch (error: any) {
        logger.error('Error visualizing contract', error);
        const msg = error.message || String(error);
        vscode.window.showErrorMessage(`Error visualizing contract: ${msg}`);
        reportDiagnostic(document.uri, msg);
        originalGraph = null;
    }
}
