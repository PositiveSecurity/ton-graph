import * as vscode from 'vscode';
import * as path from 'path';
import { visualize, visualizeProject } from './commands';
import { setApiKey } from './secrets/tokenManager';

export function activate(context: vscode.ExtensionContext) {
    const cachedDir = vscode.Uri.file(path.join(context.extensionPath, 'cached'));
    try {
        vscode.workspace.fs.createDirectory(cachedDir);
    } catch (err) {
        // Directory might already exist, that's fine
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('ton-graph.visualize', async (fileUri?: vscode.Uri) => {
            await visualize(context, fileUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ton-graph.visualizeProject', async (fileUri?: vscode.Uri) => {
            await visualizeProject(context, fileUri);
        })
    );

    const apiKeyDisposable = vscode.commands.registerCommand('ton-graph.setApiKey', async () => {
        const value = await vscode.window.showInputBox({
            prompt: 'Enter TON API key',
            ignoreFocusOut: true,
        });
        if (value !== undefined) {
            await setApiKey(context, value.trim());
            vscode.window.showInformationMessage('TON Graph API key saved');
        }
    });

    context.subscriptions.push(apiKeyDisposable);
}

export function deactivate() {}
