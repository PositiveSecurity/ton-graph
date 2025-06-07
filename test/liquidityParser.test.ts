import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseLiquidityContract } from '../src/languages/liquidity';

describe('parseLiquidityContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'let bar() {}',
      'let foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseLiquidityContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
