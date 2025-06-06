import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseCairoContract } from '../src/languages/cairo';

describe('parseCairoContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'func bar() {}',
      'func foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseCairoContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
