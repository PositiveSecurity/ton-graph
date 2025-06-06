import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseMoveContract } from '../src/parser/moveParser';

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

    it('uses cache for repeated parses', async () => {
        let called = 0;
        mock.stop('../src/parser/moveParser');
        mock('../src/parser/moveParser', { parseMoveContract: async () => { called++; return { nodes: [], edges: [] }; } });
        delete require.cache[require.resolve('../src/parser/parserUtils')];
        const { parseContractByLanguage } = require('../src/parser/parserUtils');
        const uri = { toString() { return 'file:///cache.move'; } } as any;
        await parseContractByLanguage('code', 'move', uri);
        await parseContractByLanguage('code', 'move', uri);
        expect(called).to.equal(1);
        mock.stop('../src/parser/moveParser');
    });
});
