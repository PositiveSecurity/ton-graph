import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseScillaContract } from '../src/languages/scilla';

describe('parseScillaContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'transition bar() {}',
      'transition foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseScillaContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
