import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parsePlutusContract } from '../src/languages/plutus';

describe('parsePlutusContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'fun bar() {}',
      'fun foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parsePlutusContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
