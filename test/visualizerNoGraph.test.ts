import { expect } from 'chai';
import mock = require('mock-require');

let received: any;
let disposeCb: any;
const messages: any[] = [];

const panelStub = {
  webview: {
    html: '',
    asWebviewUri: (uri: any) => ({ toString: () => uri.fsPath }),
    onDidReceiveMessage: (cb: any) => { received = cb; },
    postMessage: (msg: any) => { messages.push(msg); return Promise.resolve(true); }
  },
  onDidDispose: (cb: any) => { disposeCb = cb; }
};

mock('vscode', {
  window: {
    createWebviewPanel: () => panelStub,
    showErrorMessage: () => {},
    createOutputChannel: () => ({ appendLine: () => {} })
  },
  ViewColumn: { Beside: 1 },
  Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
});

mock('../src/visualization/templates', {
  generateVisualizationHtml: () => 'html',
  filterMermaidDiagram: (d: string) => d
});

const { createVisualizationPanel } = require('../src/visualization/visualizer');

describe('visualizer missing graph handling', () => {
  after(() => {
    mock.stop('../src/visualization/templates');
  });

  it('returns an error when panel graph is missing', async () => {
    const context = { extensionPath: process.cwd(), subscriptions: [] } as any;
    createVisualizationPanel(context, { nodes: [], edges: [] }, []);
    await new Promise(r => setTimeout(r, 0));
    if (typeof disposeCb === 'function') {
      disposeCb();
    }
    messages.length = 0;
    if (typeof received === 'function') {
      await received({ command: 'applyFilters', selectedTypes: [] });
    }
    const errMsg = messages.find(m => m.command === 'filterError');
    expect(errMsg).to.exist;
    expect(errMsg.error).to.match(/Original graph not found/);
  });
});
