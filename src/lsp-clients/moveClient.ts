import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { LanguageClient, StreamInfo } from 'vscode-languageclient/node';

export function startMoveClient(context: vscode.ExtensionContext): vscode.Disposable {
  const moveAnalyzerPath = vscode.workspace
    .getConfiguration('ton-graph')
    .get<string>('moveAnalyzerPath', 'move-analyzer');

  let proc: child_process.ChildProcess;
  try {
    proc = child_process.spawn(moveAnalyzerPath, ['--lsp'], {
      stdio: 'pipe'
    });
  } catch (err) {
    const message = `Failed to start move-analyzer: ${err instanceof Error ? err.message : err}`;
    vscode.window.showErrorMessage(message);
    return new vscode.Disposable(() => {});
  }

  proc.on('error', err => {
    vscode.window.showErrorMessage(`move-analyzer error: ${err.message}`);
  });

  const serverOptions = () =>
    Promise.resolve<StreamInfo>({
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
