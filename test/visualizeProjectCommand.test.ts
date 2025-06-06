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
    const progressReports: any[] = [];
    const vscode = {
        window: {
            activeTextEditor: options.activeTextEditor,
            showErrorMessage: (msg: string) => { vscode.errorMsg = msg; },
            createWebviewPanel: () => panelStub,
            createOutputChannel: () => ({ appendLine: () => {} }),
            withProgress: async (_opts: any, callback: any) => {
                await callback({ report: (d: any) => { progressReports.push(d); } });
            }
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
    return { vscode, panelStub, progressReports };
}

describe('visualizeProject command', () => {
    afterEach(() => {
        mock.stopAll();
        const paths = [
            '../src/commands/visualizeProject',
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

    it('visualizes project and handles messages', async () => {
        const editor = { document: { getText: () => 'code', fileName: '/tmp/a.fc', uri: { fsPath: '/tmp/a.fc' } } };
        const { vscode, panelStub, progressReports } = createVscodeMock({ activeTextEditor: editor });
        mock('vscode', vscode);
        const graph = { nodes: [], edges: [] };
        let parseArgs: any;
        mock('../src/parser/parserUtils', {
            detectLanguage: (fp: string) => { vscode.detectedPath = fp; return 'func'; },
            parseContractWithImports: async (...args: any[]) => { parseArgs = args; return graph; },
            getFunctionTypeFilters: () => []
        });
        let panelCreated = false;
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => { panelCreated = true; return panelStub; } });
        let applyArgs: any;
        mock('../src/commands/filterUtils', { applyFilters: (...args: any[]) => { applyArgs = args; } });
        let exportArgs: any;
        mock('../src/export/exportHandler', { handleExport: async (...args: any[]) => { exportArgs = args; } });

        const { visualizeProject } = require('../src/commands/visualizeProject');
        const ctx = { extensionPath: '.', subscriptions: [] } as any;
        await visualizeProject(ctx);
        await new Promise(r => setTimeout(r, 0));

        expect(progressReports.map(r => r.message)).to.deep.equal([
            'Detecting language...',
            'Processing imports...',
            'Generating visualization...',
            'Opening visualization...'
        ]);
        expect(parseArgs).to.deep.equal(['code', '/tmp/a.fc', 'func']);
        expect(panelCreated).to.be.true;

        const listener = (panelStub as any)._listener;
        await listener({ command: 'applyFilters', selectedTypes: ['t'], nameFilter: 'Foo ' });
        expect(applyArgs[0]).to.equal(panelStub);
        expect(applyArgs[1]).to.equal(graph);
        expect(applyArgs[2]).to.deep.equal(['t']);
        expect(applyArgs[3]).to.equal('foo');

        await listener({ command: 'saveSvg' });
        expect(exportArgs[0]).to.equal(panelStub);
        expect(exportArgs[1]).to.deep.equal({ command: 'saveSvg' });
        expect(exportArgs[2]).to.equal(ctx);
    });

    it('shows error when parsing fails', async () => {
        const editor = { document: { getText: () => 'code', fileName: '/tmp/a.fc', uri: { fsPath: '/tmp/a.fc' } } };
        const { vscode, progressReports } = createVscodeMock({ activeTextEditor: editor });
        mock('vscode', vscode);
        mock('../src/parser/parserUtils', {
            detectLanguage: () => 'func',
            parseContractWithImports: async () => { throw new Error('boom'); },
            getFunctionTypeFilters: () => []
        });
        mock('../src/visualization/visualizer', { createVisualizationPanel: () => ({ webview: {}, onDidDispose: () => {}, reveal: () => {}, dispose: () => {} }) });
        mock('../src/export/exportHandler', { handleExport: async () => {} });
        mock('../src/commands/filterUtils', { applyFilters: () => {} });
        const { visualizeProject } = require('../src/commands/visualizeProject');
        await visualizeProject({ extensionPath: '.', subscriptions: [] } as any);
        await new Promise(r => setTimeout(r, 0));
        expect((vscode as any).errorMsg).to.include('boom');
        expect(progressReports.map((r: any) => r.message)).to.deep.equal([
            'Detecting language...',
            'Processing imports...'
        ]);
    });
});

