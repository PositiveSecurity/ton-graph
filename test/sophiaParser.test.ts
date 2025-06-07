import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseSophiaContract } from '../src/languages/sophia';

describe('parseSophiaContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'entrypoint bar() {}',
      'entrypoint foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseSophiaContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
