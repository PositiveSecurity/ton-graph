import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseCadenceContract } from '../src/languages/cadence';

describe('parseCadenceContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'pub fun bar() {}',
      'pub fun foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseCadenceContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
