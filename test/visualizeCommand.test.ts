import { expect } from 'chai';
import mock = require('mock-require');


function createVscodeMock(options: any = {}) {
    const panelStub: any = {
        webview: {
            onDidReceiveMessage: (cb: any) => { panelStub._listener = cb; return { dispose: () => {} }; },
            postMessage: () => Promise.resolve(true),
            asWebviewUri: (uri: any) => ({ toString: () => uri.fsPath })
        },
        dispose: () => { panelStub.disposed = true; },
        reveal: () => {},
        onDidDispose: () => {}
    };
    const vscode = {
        window: {
            activeTextEditor: options.activeTextEditor,
            showErrorMessage: (msg: string) => { vscode.errorMsg = msg; },
            createWebviewPanel: () => panelStub,
            createOutputChannel: () => ({ appendLine: () => {} })
        },
        workspace: {
            fs: {
                readFile: async (uri: any) => {
                    vscode.readPath = uri;
                    return Buffer.from(options.readContent || '');
                }
            },
            openTextDocument: async (uri: any) => { vscode.opened = uri; return { fileName: uri.fsPath }; }
        },
        ViewColumn: { Beside: 1 },
        Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
    } as any;
    return { vscode, panelStub };
}

describe('visualize command', () => {
    afterEach(() => {
        mock.stopAll();
        const paths = [
            '../src/commands/visualize',
            '../src/visualization/visualizer',
            '../src/parser/parserUtils',
            '../src/export/exportHandler',
            '../src/commands/filterUtils'
        ];
        for (const p of paths) {
            if (require.cache[require.resolve(p)]) {
                delete require.cache[require.resolve(p)];
            }
        }
    });

    it('shows error when no active editor and no fileUri', async () => {
        const { vscode } = createVscodeMock();
        mock('vscode', vscode);
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => ({ webview: {}, onDidDispose: () => {}, reveal: () => {}, dispose: () => {} }) });
        mock('../src/parser/parserUtils', {
            detectLanguage: () => 'func',
            parseContractByLanguage: async () => ({ nodes: [], edges: [] }),
            getFunctionTypeFilters: () => []
        });
        mock('../src/export/exportHandler', { handleExport: async () => {} });
        mock('../src/commands/filterUtils', { applyFilters: () => {} });
        const { visualize } = require('../src/commands/visualize');
        await visualize({ extensionPath: '.', subscriptions: [] } as any);
        expect((vscode as any).errorMsg).to.equal('No active editor found');
    });

    it('reads file content when fileUri provided', async () => {
        const { vscode, panelStub } = createVscodeMock({ readContent: 'code' });
        mock('vscode', vscode);
        let parseArgs: any;
        mock('../src/parser/parserUtils', {
            detectLanguage: () => 'func',
            parseContractByLanguage: async (code: string, lang: string) => { parseArgs = [code, lang]; return { nodes: [], edges: [] }; },
            getFunctionTypeFilters: () => []
        });
        let created = false;
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => { created = true; return panelStub; } });
        mock('../src/export/exportHandler', { handleExport: async () => {} });
        mock('../src/commands/filterUtils', { applyFilters: () => {} });

        const { visualize } = require('../src/commands/visualize');
        const uri = vscode.Uri.file('/tmp/test.fc');
        await visualize({ extensionPath: '.', subscriptions: [] } as any, uri);
        expect(vscode.readPath.fsPath).to.equal('/tmp/test.fc');
        expect(vscode.opened.fsPath).to.equal('/tmp/test.fc');
        expect(parseArgs).to.deep.equal(['code', 'func']);
        expect(created).to.be.true;
    });

    it('creates new panel and disposes previous one', async () => {
        const editor = { document: { getText: () => 'a', fileName: '/tmp/a.fc', uri: { fsPath: '/tmp/a.fc' } } };
        const { vscode, panelStub } = createVscodeMock({ activeTextEditor: editor });
        mock('vscode', vscode);
        mock('../src/parser/parserUtils', {
            detectLanguage: () => 'func',
            parseContractByLanguage: async () => ({ nodes: [], edges: [] }),
            getFunctionTypeFilters: () => []
        });
        let createCount = 0;
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => { createCount++; return panelStub; } });
        mock('../src/export/exportHandler', { handleExport: async () => {} });
        mock('../src/commands/filterUtils', { applyFilters: () => {} });
        const { visualize } = require('../src/commands/visualize');
        const ctx = { extensionPath: '.', subscriptions: [] } as any;
        await visualize(ctx);
        await visualize(ctx);
        expect(createCount).to.equal(2);
        expect(panelStub.disposed).to.be.true;
    });

    it('calls applyFilters for applyFilters message', async () => {
        const editor = { document: { getText: () => 'a', fileName: '/tmp/a.fc', uri: { fsPath: '/tmp/a.fc' } } };
        const { vscode, panelStub } = createVscodeMock({ activeTextEditor: editor });
        mock('vscode', vscode);
        const graph = { nodes: [], edges: [] };
        mock('../src/parser/parserUtils', {
            detectLanguage: () => 'func',
            parseContractByLanguage: async () => graph,
            getFunctionTypeFilters: () => []
        });
        let applyArgs: any;
        mock('../src/commands/filterUtils', { applyFilters: (...args: any[]) => { applyArgs = args; } });
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => panelStub });
        mock('../src/export/exportHandler', { handleExport: async () => {} });
        const { visualize } = require('../src/commands/visualize');
        const ctx = { extensionPath: '.', subscriptions: [] } as any;
        await visualize(ctx);
        const listener = (panelStub as any)._listener;
        await listener({ command: 'applyFilters', selectedTypes: ['t'], nameFilter: 'Foo ' });
        expect(applyArgs[0]).to.equal(panelStub);
        expect(applyArgs[1]).to.equal(graph);
        expect(applyArgs[2]).to.deep.equal(['t']);
        expect(applyArgs[3]).to.equal('foo');
    });

    it('delegates other messages to handleExport', async () => {
        const editor = { document: { getText: () => 'a', fileName: '/tmp/a.fc', uri: { fsPath: '/tmp/a.fc' } } };
        const { vscode, panelStub } = createVscodeMock({ activeTextEditor: editor });
        mock('vscode', vscode);
        const graph = { nodes: [], edges: [] };
        mock('../src/parser/parserUtils', {
            detectLanguage: () => 'func',
            parseContractByLanguage: async () => graph,
            getFunctionTypeFilters: () => []
        });
        let exportArgs: any;
        mock('../src/export/exportHandler', { handleExport: async (...args: any[]) => { exportArgs = args; } });
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => panelStub });
        mock('../src/commands/filterUtils', { applyFilters: () => {} });
        const { visualize } = require('../src/commands/visualize');
        const ctx = { extensionPath: '.', subscriptions: [] } as any;
        await visualize(ctx);
        const listener = (panelStub as any)._listener;
        await listener({ command: 'saveSvg' });
        expect(exportArgs[0]).to.equal(panelStub);
        expect(exportArgs[1]).to.deep.equal({ command: 'saveSvg' });
        expect(exportArgs[2]).to.equal(ctx);
    });
});
