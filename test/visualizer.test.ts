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

describe('Visualizer', () => {
    describe('clusterNodes', () => {
        it('groups isolated and connected nodes into clusters', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'a', label: 'a()', type: 'internal', contractName: '' },
                    { id: 'b', label: 'b()', type: 'internal', contractName: '' },
                    { id: 'c', label: 'c()', type: 'internal', contractName: '' },
                    { id: 'd', label: 'd()', type: 'internal', contractName: '' },
                    { id: 'e', label: 'e()', type: 'internal', contractName: '' },
                    { id: 'f', label: 'f()', type: 'internal', contractName: '' },
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
    });

    describe('generateMermaidDiagram', () => {
        it('creates a mermaid diagram with nodes and edges', () => {
            const graph: ContractGraph = {
                nodes: [
                    { id: 'start', label: 'start()', type: 'entry', contractName: '' },
                    { id: 'foo', label: 'foo()', type: 'internal', contractName: '' },
                    { id: 'bar', label: 'bar()', type: 'external', contractName: '' },
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
                    { id: 'start', label: 'start()', type: 'entry', contractName: '' },
                    {
                        id: 'foo', label: 'foo()', type: 'internal', contractName: '',
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
    });

    describe('createVisualizationPanel', () => {
        it('sets panel HTML using the generated diagram', async () => {
            const context = { extensionPath: process.cwd(), subscriptions: [] } as any;
            const graph: ContractGraph = {
                nodes: [
                    { id: 'n', label: 'n()', type: 'entry', contractName: '' }
                ],
                edges: []
            };

            const panel = createVisualizationPanel(context, graph, []);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(panel.webview.html).to.include('graph TB;');
        });
    });
});
