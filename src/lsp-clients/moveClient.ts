import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { LanguageClient, StreamInfo } from 'vscode-languageclient/node';

export function startMoveClient(context: vscode.ExtensionContext): vscode.Disposable {
  const proc = child_process.spawn('move-analyzer', ['--lsp'], {
    stdio: 'pipe'
  });
  const serverOptions = () => Promise.resolve<StreamInfo>({
    reader: proc.stdout!,
    writer: proc.stdin!
  });
  const client = new LanguageClient('move', 'Move Analyzer', serverOptions, {
    documentSelector: [{ scheme: 'file', language: 'move' }]
  });
  client.start();
  context.subscriptions.push(client);
  return client;
}
