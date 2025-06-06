import { expect } from 'chai';
import mock = require('mock-require');


describe('extension activate', () => {
    afterEach(() => {
        mock.stopAll();
        delete require.cache[require.resolve('../src/extension')];
    });

    it('registers commands and ignores directory errors', () => {
        const registered: string[] = [];
        let dirCalled = false;
        mock('vscode', {
            commands: {
                registerCommand: (cmd: string, cb: any) => {
                    registered.push(cmd);
                    return { dispose: () => {} };
                }
            },
            workspace: {
                fs: {
                    createDirectory: () => {
                        dirCalled = true;
                        throw new Error('fail');
                    }
                }
            },
            window: { showInputBox: () => {}, showInformationMessage: () => {} },
            Uri: { file: (p: string) => ({ fsPath: p, toString() { return p; } }) }
        });

        const context = { extensionPath: '.', subscriptions: [] } as any;
        const { activate } = require('../src/extension');
        expect(() => activate(context)).to.not.throw();
        expect(dirCalled).to.be.true;
        expect(registered).to.deep.equal([
            'ton-graph.visualize',
            'ton-graph.visualizeProject',
            'ton-graph.setApiKey',
            'ton-graph.deleteApiKey'
        ]);
    });
});
