import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseInkContract } from '../src/languages/ink';

describe('parseInkContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'fn bar() {}',
      'fn foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseInkContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
