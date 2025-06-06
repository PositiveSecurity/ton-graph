import * as vscode from 'vscode';
import * as path from 'path';
import { visualize, visualizeProject } from './commands';
import { setApiKey, deleteApiKey } from './secrets/tokenManager';
import logger from './logging/logger';

export function activate(context: vscode.ExtensionContext) {
    logger.info('Activating TON Graph extension');
    const cachedDir = vscode.Uri.file(path.join(context.extensionPath, 'cached'));
    try {
        vscode.workspace.fs.createDirectory(cachedDir);
        logger.debug(`Created cached directory at ${cachedDir.fsPath}`);
    } catch (err) {
        // Directory might already exist, that's fine
        logger.debug('Cached directory already exists');
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('ton-graph.visualize', async (fileUri?: vscode.Uri) => {
            logger.info(`Command visualize triggered with ${fileUri?.fsPath ?? 'no file'}`);
            await visualize(context, fileUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ton-graph.visualizeProject', async (fileUri?: vscode.Uri) => {
            logger.info(`Command visualizeProject triggered with ${fileUri?.fsPath ?? 'no file'}`);
            await visualizeProject(context, fileUri);
        })
    );

    const apiKeyDisposable = vscode.commands.registerCommand('ton-graph.setApiKey', async () => {
        logger.info('Set API key command triggered');
        const value = await vscode.window.showInputBox({
            prompt: 'Enter TON API key',
            ignoreFocusOut: true,
        });
        if (value !== undefined) {
            await setApiKey(context, value.trim());
            logger.info('API key saved');
            vscode.window.showInformationMessage('TON Graph API key saved');
        }
    });

    const deleteApiKeyDisposable = vscode.commands.registerCommand('ton-graph.deleteApiKey', async () => {
        logger.info('Delete API key command triggered');
        await deleteApiKey(context);
        vscode.window.showInformationMessage('TON Graph API key deleted');
        logger.info('API key deleted');
    });

    context.subscriptions.push(apiKeyDisposable, deleteApiKeyDisposable);
    logger.info('TON Graph extension activated');
}

export function deactivate() {
    logger.info('TON Graph extension deactivated');
}
