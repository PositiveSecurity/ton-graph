import { expect } from 'chai';
import mock = require('mock-require');
// mock vscode module used inside visualizer
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

import { generateMermaidDiagram, clusterNodes, createVisualizationPanel } from '../src/visualization/visualizer';
import { ContractGraph } from '../src/types/graph';
import { GraphNodeKind } from '../src/types/graphNodeKind';

describe('Visualizer', () => {
    describe('clusterNodes', () => {
        it('groups isolated and connected nodes into clusters', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'a', label: 'a()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'b', label: 'b()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'c', label: 'c()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'd', label: 'd()', type: GraphNodeKind.Internal, contractName: 'file2' },
                    { id: 'e', label: 'e()', type: GraphNodeKind.Internal, contractName: 'file2' },
                    { id: 'f', label: 'f()', type: GraphNodeKind.Internal, contractName: 'file3' },
                ],
                edges: [
                    { from: 'a', to: 'b', label: '' },
                    { from: 'b', to: 'c', label: '' },
                    { from: 'd', to: 'e', label: '' },
                ],
            };

            const clusters = clusterNodes(graph);
            expect(clusters.get('f')).to.equal('file3');
            expect(clusters.get('a')).to.equal('file1');
            expect(clusters.get('b')).to.equal('file1');
            expect(clusters.get('c')).to.equal('file1');
            expect(clusters.get('d')).to.equal('file2');
            expect(clusters.get('e')).to.equal('file2');
            expect(clusters.size).to.equal(6);
        });

        it('handles multiple isolated nodes and several components', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'a', label: 'a()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'b', label: 'b()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'c', label: 'c()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'd', label: 'd()', type: GraphNodeKind.Internal, contractName: 'file2' },
                    { id: 'e', label: 'e()', type: GraphNodeKind.Internal, contractName: 'file2' },
                    { id: 'f', label: 'f()', type: GraphNodeKind.Internal, contractName: 'file3' },
                    { id: 'g', label: 'g()', type: GraphNodeKind.Internal, contractName: 'file3' },
                    { id: 'h', label: 'h()', type: GraphNodeKind.Internal, contractName: 'file4' },
                    { id: 'i', label: 'i()', type: GraphNodeKind.Internal, contractName: 'file4' },
                ],
                edges: [
                    { from: 'a', to: 'b', label: '' },
                    { from: 'b', to: 'c', label: '' },
                    { from: 'd', to: 'e', label: '' },
                    { from: 'f', to: 'g', label: '' },
                ],
            };

            const clusters = clusterNodes(graph);
            expect(clusters.get('h')).to.equal('file4');
            expect(clusters.get('i')).to.equal('file4');
            expect(clusters.get('a')).to.equal('file1');
            expect(clusters.get('b')).to.equal('file1');
            expect(clusters.get('c')).to.equal('file1');
            expect(clusters.get('d')).to.equal('file2');
            expect(clusters.get('e')).to.equal('file2');
            expect(clusters.get('f')).to.equal('file3');
            expect(clusters.get('g')).to.equal('file3');
            expect(clusters.size).to.equal(9);
        });
    });

    describe('generateMermaidDiagram', () => {
        it('creates a mermaid diagram with nodes and edges', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'start', label: 'start()', type: GraphNodeKind.Entry, contractName: 'file1' },
                    { id: 'foo', label: 'foo()', type: GraphNodeKind.Internal, contractName: 'file1' },
                    { id: 'bar', label: 'bar()', type: GraphNodeKind.External, contractName: 'file2' },
                ],
                edges: [
                    { from: 'start', to: 'foo', label: '' },
                    { from: 'foo', to: 'bar', label: '' },
                ],
            };

            const diagram = generateMermaidDiagram(graph);
            expect(diagram.startsWith('graph TB;')).to.be.true;
            expect(diagram).to.include('subgraph Cluster_0["file1"]');
            expect(diagram).to.include('subgraph Cluster_1["file2"]');
            expect(diagram).to.include('start_regular(["start"])');
            expect(diagram).to.include('foo_regular["foo"]');
            expect(diagram).to.include('bar_regular[["bar"]]');
            expect(diagram).to.include('start_regular --> foo_regular');
            expect(diagram).to.include('foo_regular --> bar_regular');
        });

        it('filters parameter comments in edge labels', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'start', label: 'start()', type: GraphNodeKind.Entry, contractName: 'file1' },
                    {
                        id: 'foo', label: 'foo()', type: GraphNodeKind.Internal, contractName: 'file1',
                        parameters: ['int a', ';; ignore', '// comment', 'int b // trailing']
                    }
                ],
                edges: [
                    { from: 'start', to: 'foo', label: '' }
                ]
            };

            const diagram = generateMermaidDiagram(graph);
            expect(diagram).to.include('|"(int a, int b)"| foo_regular');
        });

        it('escapes special characters in node labels', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'plus+', label: 'plus+()', type: GraphNodeKind.Entry, contractName: 'file1' },
                    { id: 'cash$', label: 'cash$()', type: GraphNodeKind.Internal, contractName: 'file1' }
                ],
                edges: []
            };

            const diagram = generateMermaidDiagram(graph);
            expect(diagram).to.include('plus__regular(["plus\\+"])');
            expect(diagram).to.include('cash__regular["cash$"]');
        });
    });

    describe('createVisualizationPanel', () => {
        it('sets panel HTML using the generated diagram', async () => {
            const context = { extensionPath: process.cwd(), subscriptions: [] } as any;
            const graph: ContractGraph = {
                nodes: [
                    { id: 'n', label: 'n()', type: GraphNodeKind.Entry, contractName: '' }
                ],
                edges: []
            };

            const panel = createVisualizationPanel(context, graph, []);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(panel.webview.html).to.include('graph TB;');
        });

        it('injects a CSP meta tag', async () => {
            const context = { extensionPath: process.cwd(), subscriptions: [] } as any;
            const graph: ContractGraph = {
                nodes: [
                    { id: 'n', label: 'n()', type: GraphNodeKind.Entry, contractName: '' }
                ],
                edges: []
            };

            const panel = createVisualizationPanel(context, graph, []);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(panel.webview.html).to.include('Content-Security-Policy');
        });
    });

    describe('handleFilterRequest', () => {
        it('posts updated diagram to the panel', async () => {
            let received: any;
            const messages: any[] = [];
            panelStub.webview.postMessage = ((msg: any) => { messages.push(msg); return Promise.resolve(true); }) as any;
            panelStub.webview.onDidReceiveMessage = ((cb: any) => { received = cb; }) as any;

            const context = { extensionPath: process.cwd(), subscriptions: [] } as any;
            const graph: ContractGraph = {
                nodes: [
                    { id: 'a', label: 'a()', type: GraphNodeKind.Entry, contractName: '' },
                    { id: 'b', label: 'b()', type: GraphNodeKind.Internal, contractName: '' }
                ],
                edges: [ { from: 'a', to: 'b', label: '' } ]
            };

            const panel = createVisualizationPanel(context, graph, []);
            await new Promise(resolve => setTimeout(resolve, 0));
            const expected = generateMermaidDiagram(graph);
            if (typeof received === 'function') {
                await received({ command: 'applyFilters', selectedTypes: [], nameFilter: '' });
            }
            const update = messages.find(m => m.command === 'updateDiagram');
            expect(update).to.exist;
            expect(update.diagram).to.equal(expected);
            // prevent side effects on later tests
            panel.webview.onDidReceiveMessage(() => {});
            panel.webview.postMessage = () => Promise.resolve(true);
        });
    });
});
