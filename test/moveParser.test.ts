import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseMoveContract } from '../src/languages/move/moveParser';

const sample = `module M {
    fun init() {
        transfer();
    }

    fun transfer() {
        credit();
    }

    fun credit() {}
}`;

describe('parseMoveContract', () => {
    it('parses functions and edges', async () => {
        const graph = await parseMoveContract(sample);
        const ids = graph.nodes.map(n => n.id);
        expect(ids).to.have.members(['init', 'transfer', 'credit']);
        expect(graph.edges).to.deep.include.members([
            { from: 'init', to: 'transfer', label: '' },
            { from: 'transfer', to: 'credit', label: '' }
        ]);
    });
});
