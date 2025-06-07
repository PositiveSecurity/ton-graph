import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseLeoContract } from '../src/languages/leo';

describe('parseLeoContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'function bar() {}',
      'function foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseLeoContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
