const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

module.exports = async function () {
  const ext = vscode.extensions.getExtension('positiveweb3.ton-graph');
  if (ext) {
    await ext.activate();
  }

  const panelStub = {
    webview: {
      html: '',
      asWebviewUri: (uri) => uri,
      onDidReceiveMessage: () => {},
      postMessage: () => Promise.resolve(true)
    },
    onDidDispose: () => {}
  };

  const originalCreate = vscode.window.createWebviewPanel;
  vscode.window.createWebviewPanel = () => panelStub;

  const samplePath = path.join(__dirname, '..', 'examples', 'func_nominators.fc');
  await vscode.commands.executeCommand('ton-graph.visualize', vscode.Uri.file(samplePath));

  if (!panelStub.webview.html.includes('.mermaid')) {
    throw new Error('Mermaid script not found in webview');
  }

  const outputPath = process.env.OUTPUT_HTML;
  if (outputPath) {
    fs.writeFileSync(outputPath, panelStub.webview.html, 'utf8');
  }

  vscode.window.createWebviewPanel = originalCreate;
};
