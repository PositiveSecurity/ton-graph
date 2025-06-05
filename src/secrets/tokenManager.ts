import * as vscode from 'vscode';

const SECRET_KEY = 'toncenterApiKey';

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    return context.secrets.get(SECRET_KEY);
}

export async function setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
    await context.secrets.store(SECRET_KEY, apiKey);
}

export async function deleteApiKey(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete(SECRET_KEY);
}
