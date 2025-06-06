import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { activeTextEditor: undefined, createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseTactContract } from '../src/parser/tactParser';

describe('parseTactContract', () => {
    it('parses init, receive, fun and get fun', async () => {
        const code = [
            'contract Sample {',
            '    init(int a) { foo(a); }',
            '    receive("msg", int b) { foo(b); }',
            '    fun foo(int c) { bar(c); }',
            '    get fun bar(int d) {}',
            '}'
        ].join('\n');
        const graph = await parseTactContract(code);
        const ids = graph.nodes.map(n => n.id);
        expect(ids).to.have.members(['init', 'receive', 'foo', 'bar']);

        const init = graph.nodes.find(n => n.id === 'init');
        const recv = graph.nodes.find(n => n.id === 'receive');
        const foo = graph.nodes.find(n => n.id === 'foo');
        const bar = graph.nodes.find(n => n.id === 'bar');
        expect(init?.parameters).to.deep.equal(['inta']);
        expect(recv?.parameters).to.deep.equal(['"msg"', 'intb']);
        expect(foo?.parameters).to.deep.equal(['intc']);
        expect(bar?.parameters).to.deep.equal(['intd']);

        expect(graph.edges).to.deep.include({ from: 'init', to: 'foo', label: '' });
        expect(graph.edges).to.deep.include({ from: 'receive', to: 'foo', label: '' });
        expect(graph.edges).to.deep.include({ from: 'foo', to: 'bar', label: '' });
        expect(graph.edges).to.have.lengthOf(3);
    });
});
