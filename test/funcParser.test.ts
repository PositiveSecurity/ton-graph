import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseContractCode } from '../src/parser/funcParser';

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
});
