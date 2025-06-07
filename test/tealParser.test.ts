import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseTealContract } from '../src/languages/teal';

describe('parseTealContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'sub bar() {}',
      'sub foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseTealContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
