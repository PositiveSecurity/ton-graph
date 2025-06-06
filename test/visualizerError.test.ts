import { expect } from 'chai';
import mock = require('mock-require');

let received: any;
const messages: any[] = [];
const panelStub = {
  webview: {
    html: '',
    asWebviewUri: (uri: any) => ({ toString: () => uri.fsPath }),
    onDidReceiveMessage: (cb: any) => { received = cb; },
    postMessage: (msg: any) => { messages.push(msg); return Promise.resolve(true); }
  },
  onDidDispose: () => {}
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
  generateVisualizationHtml: (_d: string, _m: string, _f: any, _w: string, _wv: any) => 'html',
  filterMermaidDiagram: () => { throw new Error('bad'); }
});

const { createVisualizationPanel } = require('../src/visualization/visualizer');

describe('createVisualizationPanel error handling', () => {
  after(() => {
    mock.stop('../src/visualization/templates');
  });

  it('handles errors during filtering gracefully', async () => {
    const context = { extensionPath: process.cwd(), subscriptions: [] } as any;
    createVisualizationPanel(context, { nodes: [], edges: [] }, []);
    await new Promise(r => setTimeout(r, 0));
    if (typeof received === 'function') {
      expect(() => received({ command: 'applyFilters', selectedTypes: [] })).not.to.throw();
    }
  });
});
