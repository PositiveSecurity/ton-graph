import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseContractCode } from '../src/languages/func/funcParser';

describe('parseContractCode', () => {
    it('parses functions and calls without built-ins', async () => {
        const code = [
            'int foo() { return 1; }',
            'int main() { foo(); }'
        ].join('\n');
        const graph = await parseContractCode(code);
        const ids = graph.nodes.map(n => n.id);
        expect(ids).to.have.members(['foo', 'main']);
        expect(graph.edges).to.deep.equal([{ from: 'main', to: 'foo', label: '' }]);
        const foo = graph.nodes.find(n => n.id === 'foo');
        const main = graph.nodes.find(n => n.id === 'main');
        expect(foo?.parameters).to.deep.equal([]);
        expect(main?.parameters).to.deep.equal([]);
    });

    it('ignores built-in function calls', async () => {
        const code = [
            'int foo(int a) { return a; }',
            'int main(int b) {',
            '    throw_if(b, b);',
            '    foo(b);',
            '}'
        ].join('\n');
        const graph = await parseContractCode(code);
        const ids = graph.nodes.map(n => n.id);
        expect(ids).to.have.members(['foo', 'main']);
        expect(ids).to.not.include('throw_if');
        expect(graph.edges).to.deep.equal([{ from: 'main', to: 'foo', label: '' }]);
        const foo = graph.nodes.find(n => n.id === 'foo');
        const main = graph.nodes.find(n => n.id === 'main');
        expect(foo?.parameters).to.deep.equal(['int a']);
        expect(main?.parameters).to.deep.equal(['int b']);
    });

    it('uses cache for repeated parses', async () => {
        let called = 0;
        mock.stop('../src/languages/func/funcParser');
        mock('../src/languages/func/funcParser', { parseContractCode: async () => { called++; return { nodes: [], edges: [] }; } });
        delete require.cache[require.resolve('../src/parser/parserUtils')];
        const { parseContractByLanguage } = require('../src/parser/parserUtils');
        const uri = { toString() { return 'file:///cache.fc'; } } as any;
        await parseContractByLanguage('code', 'func', uri);
        await parseContractByLanguage('code', 'func', uri);
        expect(called).to.equal(1);
        mock.stop('../src/languages/func/funcParser');
    });
});
