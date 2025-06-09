import * as vscode from 'vscode';
import { createVisualizationPanel } from '../visualization/visualizer';
import { handleExport } from '../export/exportHandler';
import { ContractGraph } from '../types/graph';
import { detectLanguage, parseContractWithImports, getFunctionTypeFilters } from '../parser/parserUtils';
import logger from '../logging/logger';
import { applyFilters } from './filterUtils';
import { reportDiagnostic, clearDiagnostics } from '../logging/diagnostics';

let panel: vscode.WebviewPanel | undefined;

export async function visualizeProject(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
    logger.info(`visualizeProject command started with ${fileUri?.fsPath ?? 'active editor'}`);
    const targetUri = fileUri ?? vscode.window.activeTextEditor?.document.uri;
    if (targetUri) {
        clearDiagnostics(targetUri);
        reportDiagnostic(targetUri, 'Project visualization command initiated', 0, 0, vscode.DiagnosticSeverity.Information);
    }
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
            reportDiagnostic(document.uri, 'File content loaded', 0, 0, vscode.DiagnosticSeverity.Information);
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
        reportDiagnostic(document.uri, 'Using active editor content', 0, 0, vscode.DiagnosticSeverity.Information);
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
            reportDiagnostic(document.uri, `Detected language ${language}`, 0, 0, vscode.DiagnosticSeverity.Information);

            progress.report({ increment: 30, message: 'Processing imports...' });
            let originalGraph = await parseContractWithImports(code, filePath, language);
            logger.debug('Parsed contract with imports');
            reportDiagnostic(document.uri, 'Contract with imports parsed', 0, 0, vscode.DiagnosticSeverity.Information);

            progress.report({ increment: 30, message: 'Generating visualization...' });
            if (panel) {
                panel.dispose();
            }

            panel = createVisualizationPanel(context, originalGraph, getFunctionTypeFilters(language), 'Contract Project Visualization');
            logger.debug('Visualization panel created');
            reportDiagnostic(document.uri, 'Visualization panel created', 0, 0, vscode.DiagnosticSeverity.Information);

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
                        reportDiagnostic(document.uri, `Filters applied types=${selectedTypes.join(',')} name=${nameFilter}`,
                            0, 0, vscode.DiagnosticSeverity.Information);
                    } else {
                        logger.debug(`Handling export command ${message.command}`);
                        await handleExport(panel!, message, context);
                        reportDiagnostic(document.uri, `Export command ${message.command}`,
                            0, 0, vscode.DiagnosticSeverity.Information);
                    }
                },
                undefined,
                context.subscriptions
            );

            progress.report({ increment: 20, message: 'Opening visualization...' });
            panel!.reveal(vscode.ViewColumn.Beside);
            logger.debug('Visualization panel revealed');
            reportDiagnostic(document.uri, 'Visualization panel revealed', 0, 0, vscode.DiagnosticSeverity.Information);
            logger.info('visualizeProject command completed successfully');
            reportDiagnostic(document.uri, 'Project visualization completed', 0, 0, vscode.DiagnosticSeverity.Information);
        });
    } catch (error: any) {
        logger.error('Error visualizing contract project', error);
        vscode.window.showErrorMessage(`Error visualizing contract project: ${error.message || String(error)}`);
    }
}
