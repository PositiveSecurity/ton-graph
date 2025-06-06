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
                    { id: 'a', label: 'a()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'b', label: 'b()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'c', label: 'c()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'd', label: 'd()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'e', label: 'e()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'f', label: 'f()', type: GraphNodeKind.Internal, contractName: '' },
                ],
                edges: [
                    { from: 'a', to: 'b', label: '' },
                    { from: 'b', to: 'c', label: '' },
                    { from: 'd', to: 'e', label: '' },
                ],
            };

            const clusters = clusterNodes(graph);
            expect(clusters.get('f')).to.equal(0);
            expect(clusters.get('a')).to.equal(1);
            expect(clusters.get('b')).to.equal(1);
            expect(clusters.get('c')).to.equal(1);
            expect(clusters.get('d')).to.equal(2);
            expect(clusters.get('e')).to.equal(2);
            expect(clusters.size).to.equal(6);
        });

        it('handles multiple isolated nodes and several components', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'a', label: 'a()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'b', label: 'b()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'c', label: 'c()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'd', label: 'd()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'e', label: 'e()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'f', label: 'f()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'g', label: 'g()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'h', label: 'h()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'i', label: 'i()', type: GraphNodeKind.Internal, contractName: '' },
                ],
                edges: [
                    { from: 'a', to: 'b', label: '' },
                    { from: 'b', to: 'c', label: '' },
                    { from: 'd', to: 'e', label: '' },
                    { from: 'f', to: 'g', label: '' },
                ],
            };

            const clusters = clusterNodes(graph);
            // isolated nodes should be in cluster 0
            expect(clusters.get('h')).to.equal(0);
            expect(clusters.get('i')).to.equal(0);
            // first connected component
            expect(clusters.get('a')).to.equal(1);
            expect(clusters.get('b')).to.equal(1);
            expect(clusters.get('c')).to.equal(1);
            // second component
            expect(clusters.get('d')).to.equal(2);
            expect(clusters.get('e')).to.equal(2);
            // third component
            expect(clusters.get('f')).to.equal(3);
            expect(clusters.get('g')).to.equal(3);
            expect(clusters.size).to.equal(9);
        });
    });

    describe('generateMermaidDiagram', () => {
        it('creates a mermaid diagram with nodes and edges', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'start', label: 'start()', type: GraphNodeKind.Entry, contractName: '' },
                    { id: 'foo', label: 'foo()', type: GraphNodeKind.Internal, contractName: '' },
                    { id: 'bar', label: 'bar()', type: GraphNodeKind.External, contractName: '' },
                ],
                edges: [
                    { from: 'start', to: 'foo', label: '' },
                    { from: 'foo', to: 'bar', label: '' },
                ],
            };

            const diagram = generateMermaidDiagram(graph);
            expect(diagram.startsWith('graph TB;')).to.be.true;
            expect(diagram).to.include('subgraph Cluster_0["Main"]');
            expect(diagram).to.include('start_regular(["start"])');
            expect(diagram).to.include('foo_regular["foo"]');
            expect(diagram).to.include('bar_regular[["bar"]]');
            expect(diagram).to.include('start_regular --> foo_regular');
            expect(diagram).to.include('foo_regular --> bar_regular');
        });

        it('filters parameter comments in edge labels', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'start', label: 'start()', type: GraphNodeKind.Entry, contractName: '' },
                    {
                        id: 'foo', label: 'foo()', type: GraphNodeKind.Internal, contractName: '',
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
                    { id: 'plus+', label: 'plus+()', type: GraphNodeKind.Entry, contractName: '' },
                    { id: 'cash$', label: 'cash$()', type: GraphNodeKind.Internal, contractName: '' }
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
