const vscode = require('vscode');
const path = require('path');

module.exports = async function () {
  const ext = vscode.extensions.getExtension('positiveweb3.ton-graph');
  if (ext) {
    await ext.activate();
  }

  const panelStub = {
    webview: {
      html: '',
      asWebviewUri: uri => uri,
      onDidReceiveMessage: () => {},
      postMessage: () => Promise.resolve(true)
    },
    onDidDispose: () => {}
  };

  const originalCreate = vscode.window.createWebviewPanel;
  vscode.window.createWebviewPanel = () => panelStub;

  const samplePath = path.join(__dirname, '..', 'examples', 'malicious.fc');
  await vscode.commands.executeCommand('ton-graph.visualize', vscode.Uri.file(samplePath));

  if (panelStub.webview.html.includes('<script') || panelStub.webview.html.includes('window.xss')) {
    throw new Error('Unsanitized content found in webview');
  }

  vscode.window.createWebviewPanel = originalCreate;
};
