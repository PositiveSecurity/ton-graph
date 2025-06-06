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

    it('rejects PNG export when SVG is invalid', async () => {
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({ pngData: { command: 'pngData', content: 'data:image/png;base64,' + Buffer.from('png').toString('base64') } }, messages);
        await handleExport(panel, { command: 'savePng', content: 'not-svg' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('rejects PNG export when no data received', async () => {
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({ pngData: { command: 'pngData', content: undefined } }, messages);
        await handleExport(panel, { command: 'savePng', content: '<svg></svg>' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('saves Mermaid file when webview returns data', async () => {
        const tmp = path.join(os.tmpdir(), 'out.mmd');
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            getMermaidContent: { command: 'mermaidContent', content: 'graph TB;' }
        }, messages);
        await handleExport(panel, { command: 'saveMermaid' }, { extensionPath: '.' });
        expect(written?.toString()).to.equal('graph TB;');
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.true;
        expect(result.type).to.equal('mermaid');
    });

    it('fails to save Mermaid when no content is returned', async () => {
        const tmp = path.join(os.tmpdir(), 'out.mmd');
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            getMermaidContent: { command: 'mermaidContent', content: undefined }
        }, messages);
        await handleExport(panel, { command: 'saveMermaid' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('saves JPG when data URL is valid', async () => {
        const tmp = path.join(os.tmpdir(), 'out.jpg');
        let written: Buffer | undefined;
        const messages: any[] = [];
        const jpgData = 'data:image/jpeg;base64,' + Buffer.from('jpg').toString('base64');
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            convertToJpg: undefined,
            jpgData: { command: 'jpgData', content: jpgData }
        }, messages);
        await handleExport(panel, { command: 'saveJpg', content: '<svg></svg>' }, { extensionPath: '.' });
        expect(written).to.exist;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.true;
        expect(result.type).to.equal('jpg');
    });

    it('rejects invalid JPG data url', async () => {
        const tmp = path.join(os.tmpdir(), 'out.jpg');
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            convertToJpg: undefined,
            jpgData: { command: 'jpgData', content: 'data:image/jpeg;base64,notbase64' }
        }, messages);
        await handleExport(panel, { command: 'saveJpg', content: '<svg></svg>' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('rejects JPG export when SVG is invalid', async () => {
        const tmp = path.join(os.tmpdir(), 'out.jpg');
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({ jpgData: { command: 'jpgData', content: 'data:image/jpeg;base64,' + Buffer.from('jpg').toString('base64') } }, messages);
        await handleExport(panel, { command: 'saveJpg', content: 'not-svg' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('rejects JPG export when no data received', async () => {
        const tmp = path.join(os.tmpdir(), 'out.jpg');
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
                    writeFile: async (_uri: any, data: any) => {
                        written = Buffer.from(data);
                    }
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });
        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({ jpgData: { command: 'jpgData', content: undefined } }, messages);
        await handleExport(panel, { command: 'saveJpg', content: '<svg></svg>' }, { extensionPath: '.' });
        expect(written).to.be.undefined;
        const result = messages.find(m => m.command === 'saveResult');
        expect(result.success).to.be.false;
    });

    it('updates webview html when filters are applied', async () => {
        const messages: any[] = [];
        let html = '';
        mock('../src/visualization/templates', {
            filterMermaidDiagram: () => 'filtered',
            generateVisualizationHtml: () => 'filtered-html'
        });
        mock('vscode', {
            window: {
                activeTextEditor: undefined,
                showSaveDialog: async () => undefined,
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createOutputChannel: () => ({ appendLine: () => {} })
            },
            workspace: { fs: { writeFile: async () => {} } },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });

        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            getMermaidContent: { command: 'mermaidContent', content: 'orig' }
        }, messages);
        panel.webview.html = html;
        await handleExport(panel, { command: 'applyFilters', selectedTypes: ['regular'], nameFilter: 'foo' }, { extensionPath: '.' });
        html = panel.webview.html;
        expect(html).to.equal('filtered-html');
        const result = messages.find(m => m.command === 'filtersApplied');
        expect(result.success).to.be.true;
        expect(result.selectedTypes).to.deep.equal(['regular']);
        expect(result.nameFilter).to.equal('foo');
    });

    it('fails to apply filters when no graph is returned', async () => {
        const messages: any[] = [];
        mock('../src/visualization/templates', {
            filterMermaidDiagram: () => 'filtered',
            generateVisualizationHtml: () => 'filtered-html'
        });
        mock('vscode', {
            window: {
                activeTextEditor: undefined,
                showSaveDialog: async () => undefined,
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                createOutputChannel: () => ({ appendLine: () => {} })
            },
            workspace: { fs: { writeFile: async () => {} } },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });

        handleExport = require('../src/export/exportHandler').handleExport;
        const panel = createPanel({
            getMermaidContent: { command: 'mermaidContent', content: '' }
        }, messages);
        await handleExport(panel, { command: 'applyFilters', selectedTypes: ['regular'], nameFilter: '' }, { extensionPath: '.' });
        const result = messages.find(m => m.command === 'filtersApplied');
        expect(result.success).to.be.false;
    });
});
