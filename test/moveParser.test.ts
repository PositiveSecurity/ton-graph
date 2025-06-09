import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseMoveContract } from '../src/parser/moveParser';
import { parseMove } from '../src/parser/moveParser';
import { clusterNodes } from '../src/visualization/visualizer';

const sample = `module M {
    fun init() {
        transfer();
    }

    fun transfer() {
        credit();
    }

    fun credit() {}
}`;

const modifierSample = `module M {
    public entry fun main() {}
    public(script) fun run() {}
}`;

const genericSample = `module M {
    fun init() {
        transfer<u8>();
    }

    fun transfer<T>() {
        credit<T>();
    }

    fun credit<T>() {}
}`;

const duplicateSample = `module M {
    fun init() {
        transfer();
        transfer();
    }

    fun transfer() {}
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

    it('detects entry and script functions', async () => {
        const graph = await parseMoveContract(modifierSample);
        const entry = graph.nodes.find(n => n.id === 'M::main');
        const script = graph.nodes.find(n => n.id === 'M::run');
        expect(entry?.functionType).to.equal('entry');
        expect(script?.functionType).to.equal('script');
    });

    it('parses use declarations with aliases and multiple items', () => {
        const code = `module M {\n    use std::option::{Self, Option as Opt};\n    use 0x1::foo::Bar as Baz;\n}`;
        const { ast } = parseMove(code);
        const uses = ast.modules[0].uses;
        expect(uses).to.deep.include.members([
            { alias: 'Self', path: 'std::option::Self' },
            { alias: 'Opt', path: 'std::option::Option' },
            { alias: 'Baz', path: '0x1::foo::Bar' }
        ]);
    });

    it('resolves generic calls to function ids', async () => {
        const graph = await parseMoveContract(genericSample);
        const ids = graph.nodes.map(n => n.id);
        expect(ids).to.have.members(['M::init', 'M::transfer', 'M::credit']);
        expect(graph.edges).to.deep.include.members([
            { from: 'M::init', to: 'M::transfer', label: '' },
            { from: 'M::transfer', to: 'M::credit', label: '' }
        ]);
    });

    it('does not create duplicate edges', async () => {
        const graph = await parseMoveContract(duplicateSample);
        expect(graph.edges).to.deep.equal([
            { from: 'M::init', to: 'M::transfer', label: '' }
        ]);
    });

    it('returns empty graph on malformed code', async () => {
        const graph = await parseMoveContract('module {');
        expect(graph.nodes).to.be.empty;
        expect(graph.edges).to.be.empty;
    });

    it('clusters external calls under their module path', async () => {
        const code = [
            'module M {',
            '  fun main() {',
            '    aptos_framework::account::create_signer_with_capability();',
            '  }',
            '}',
        ].join('\n');
        const graph = await parseMoveContract(code);
        const clusters = clusterNodes(graph);
        const nodeId = 'aptos_framework::account::create_signer_with_capability';
        const node = graph.nodes.find(n => n.id === nodeId);
        expect(node?.contractName).to.equal('aptos_framework::account');
        expect(node?.label).to.equal('create_signer_with_capability()');
        expect(clusters.get(nodeId)).to.equal('aptos_framework::account');
    });
});
