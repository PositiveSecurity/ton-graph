import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseMichelsonContract } from '../src/languages/michelson';

describe('parseMichelsonContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'func bar() {}',
      'func foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseMichelsonContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
