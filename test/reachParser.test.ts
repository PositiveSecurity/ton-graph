import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseReachContract } from '../src/languages/reach';

describe('parseReachContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'function bar() {}',
      'function foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseReachContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
