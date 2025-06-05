import { expect } from 'chai';
import mock = require('mock-require');

const panelStub = {
    webview: {
        html: '',
        asWebviewUri: (uri: any) => ({ toString: () => uri.fsPath }),
        onDidReceiveMessage: () => {},
        postMessage: () => Promise.resolve(true)
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

import { applyFilters } from '../src/commands/filterUtils';
import { GraphNodeKind } from '../src/types/graphNodeKind';
import { ContractGraph } from '../src/types/graph';

function createPanel(messages: any[]) {
    return {
        webview: {
            postMessage: (msg: any) => { messages.push(msg); return Promise.resolve(true); },
            asWebviewUri: (uri: any) => ({ toString: () => uri.fsPath }),
            onDidReceiveMessage: () => ({ dispose: () => {} })
        },
        onDidDispose: () => {}
    } as any;
}

describe('applyFilters', () => {
    const graph: ContractGraph = {
        nodes: [
            { id: 'start', label: 'start()', type: GraphNodeKind.Entry, contractName: '', functionType: 'regular' },
            { id: 'foo', label: 'foo()', type: GraphNodeKind.Internal, contractName: '', functionType: 'impure' },
            { id: 'bar+plus', label: 'bar+plus()', type: GraphNodeKind.Internal, contractName: '', functionType: 'regular' },
            { id: 'special$', label: 'special$()', type: GraphNodeKind.Internal, contractName: '', functionType: 'impure' }
        ],
        edges: [
            { from: 'start', to: 'foo', label: '' },
            { from: 'foo', to: 'bar+plus', label: '' },
            { from: 'bar+plus', to: 'special$', label: '' }
        ]
    };

    it('filters by type and name together', () => {
        const messages: any[] = [];
        const panel = createPanel(messages);
        applyFilters(panel, graph, ['regular'], 'bar+plus');
        const diagram = messages[0].diagram as string;
        expect(diagram).to.include('bar_plus_regular');
        expect(diagram).to.not.include('foo_impure');
    });

    it('handles special characters in name filter', () => {
        const messages: any[] = [];
        const panel = createPanel(messages);
        applyFilters(panel, graph, ['impure'], 'special$');
        const diagram = messages[0].diagram as string;
        expect(diagram).to.include('special__impure');
        expect(diagram).to.not.include('bar_plus_regular');
    });

    it('returns empty diagram for no matches', () => {
        const messages: any[] = [];
        const panel = createPanel(messages);
        applyFilters(panel, graph, ['regular'], 'nonexistent');
        const diagram = messages[0].diagram as string;
        expect(diagram.trim()).to.equal('graph TB;');
    });
});
