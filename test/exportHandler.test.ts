import { expect } from 'chai';
import mock = require('mock-require');
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

function createPanel(expectedResponses: Record<string, any>, sentMessages: any[]) {
    const panel: any = { webview: {} };
    panel.webview.postMessage = async (msg: any) => {
        sentMessages.push(msg);
        if (msg.command === 'convertToPng' && expectedResponses['pngData']) {
            setImmediate(() => {
                panel.webview._listener?.(expectedResponses['pngData']);
            });
        } else if (msg.command === 'convertToJpg' && expectedResponses['jpgData']) {
            setImmediate(() => {
                panel.webview._listener?.(expectedResponses['jpgData']);
            });
        } else {
            const resp = expectedResponses[msg.command];
            if (resp) {
                setImmediate(() => {
                    panel.webview._listener?.(resp);
                });
            }
        }
        return true;
    };
    panel.webview.onDidReceiveMessage = (cb: any) => {
        panel.webview._listener = cb;
        return { dispose: () => {} };
    };
    panel.webview.asWebviewUri = (uri: any) => ({ toString: () => uri.fsPath });
    return panel;
}

describe('exportHandler', () => {
    let handleExport: any;

    afterEach(() => {
        mock.stopAll();
        delete require.cache[require.resolve('../src/export/exportHandler')];
        const paths = ['../src/parser/importHandler', '../src/parser/parserUtils'];
        for (const p of paths) {
            if (require.cache[require.resolve(p)]) {
                delete require.cache[require.resolve(p)];
            }
        }
    });

    it('saves SVG when content is valid', async () => {
        const tmp = path.join(os.tmpdir(), 'valid.svg');
        let written: Buffer | undefined;
        const messages: any[] = [];
        mock('vscode', {
            window: {
                activeTextEditor: undefined,
                showSaveDialog: async () => ({ fsPath: tmp }),
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createOutputChannel: () => ({ appendLine: () => {} })
            },
            workspace: {
                fs: {
                    writeFile: async (_uri: any, data: any) => { written = Buffer.from(data); }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const svg = '<svg></svg>';
        const panel = createPanel({ getSvgContent: { command: 'svgContent', content: svg } }, messages);
        await handleExport(panel, { command: 'saveSvg' }, { extensionPath: '.' });
        expect(written?.toString()).to.equal(svg);
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.true;
        expect(result.type).to.equal('svg');
    });

    it('rejects invalid SVG content', async () => {
        const tmp = path.join(os.tmpdir(), 'invalid.svg');
        let written: Buffer | undefined;
        const messages: any[] = [];
        mock('vscode', {
            window: {
                activeTextEditor: undefined,
                showSaveDialog: async () => ({ fsPath: tmp }),
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createOutputChannel: () => ({ appendLine: () => {} })
            },
            workspace: {
                fs: {
                    writeFile: async (_uri: any, data: any) => { written = Buffer.from(data); }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({ getSvgContent: { command: 'svgContent', content: 'bad' } }, messages);
        await handleExport(panel, { command: 'saveSvg' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('saves PNG when base64 is valid', async () => {
        const tmp = path.join(os.tmpdir(), 'out.png');
        let written: Buffer | undefined;
        const messages: any[] = [];
        const pngData = 'data:image/png;base64,' + Buffer.from('png').toString('base64');
        mock('vscode', {
            window: {
                activeTextEditor: undefined,
                showSaveDialog: async () => ({ fsPath: tmp }),
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createOutputChannel: () => ({ appendLine: () => {} })
            },
            workspace: {
                fs: {
                    writeFile: async (_uri: any, data: any) => { written = Buffer.from(data); }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            convertToPng: undefined,
            pngData: { command: 'pngData', content: pngData }
        }, messages);
        // Need to respond to getSvgContent? actually function doesn't request - uses message.content only for validation
        await handleExport(panel, { command: 'savePng', content: '<svg></svg>' }, { extensionPath: '.' });
        expect(written).to.exist;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.true;
        expect(result.type).to.equal('png');
    });

    it('rejects invalid PNG data url', async () => {
        const tmp = path.join(os.tmpdir(), 'out.png');
        let written: Buffer | undefined;
        const messages: any[] = [];
        mock('vscode', {
            window: {
                activeTextEditor: undefined,
                showSaveDialog: async () => ({ fsPath: tmp }),
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createOutputChannel: () => ({ appendLine: () => {} })
            },
            workspace: {
                fs: {
                    writeFile: async (_uri: any, data: any) => { written = Buffer.from(data); }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            convertToPng: undefined,
            pngData: { command: 'pngData', content: 'data:image/png;base64,notbase64' }
        }, messages);
        await handleExport(panel, { command: 'savePng', content: '<svg></svg>' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });
});
