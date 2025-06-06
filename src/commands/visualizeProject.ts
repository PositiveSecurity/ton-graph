import * as vscode from 'vscode';
import { createVisualizationPanel } from '../visualization/visualizer';
import { handleExport } from '../export/exportHandler';
import { ContractGraph } from '../types/graph';
import { detectLanguage, parseContractWithImports, getFunctionTypeFilters } from '../parser/parserUtils';
import logger from '../logging/logger';
import { applyFilters } from './filterUtils';

let panel: vscode.WebviewPanel | undefined;

export async function visualizeProject(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
    logger.info(`visualizeProject command started with ${fileUri?.fsPath ?? 'active editor'}`);
    let document: vscode.TextDocument;
    let code: string;
    let filePath: string;

    if (fileUri) {
        try {
            logger.debug(`Reading file ${fileUri.fsPath}`);
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            code = Buffer.from(fileData).toString('utf8');
            filePath = fileUri.fsPath;
            document = await vscode.workspace.openTextDocument(fileUri);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Could not read file: ${error.message || String(error)}`);
            logger.error('Failed to read file', error);
            return;
        }
    } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            logger.error('No active editor found');
            return;
        }
        document = editor.document;
        code = document.getText();
        filePath = document.uri.fsPath;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Visualizing contract project...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 20, message: 'Detecting language...' });
            const language = detectLanguage(filePath);
            logger.debug(`Detected language ${language}`);

            progress.report({ increment: 30, message: 'Processing imports...' });
            let originalGraph = await parseContractWithImports(code, filePath, language);
            logger.debug('Parsed contract with imports');

            progress.report({ increment: 30, message: 'Generating visualization...' });
            if (panel) {
                panel.dispose();
            }

            panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language), 'Contract Project Visualization');
            logger.debug('Visualization panel created');

            panel.onDidDispose(() => {
                panel = undefined;
            }, null, context.subscriptions);

            panel!.webview.onDidReceiveMessage(
                async (message) => {
                    if (message.command === 'applyFilters') {
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

            progress.report({ increment: 20, message: 'Opening visualization...' });
            panel!.reveal(vscode.ViewColumn.Beside);
            logger.debug('Visualization panel revealed');
            logger.info('visualizeProject command completed successfully');
        });
    } catch (error: any) {
        logger.error('Error visualizing contract project', error);
        vscode.window.showErrorMessage(`Error visualizing contract project: ${error.message || String(error)}`);
    }
}
