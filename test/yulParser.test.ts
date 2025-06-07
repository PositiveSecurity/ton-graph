import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseYulContract } from '../src/languages/yul';

describe('parseYulContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'function bar() -> result { result := 1 }',
      'function foo() -> result {',
      '  result := bar()',
      '}'
    ].join('\n');
    const graph = parseYulContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
