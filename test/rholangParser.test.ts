import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseRholangContract } from '../src/languages/rholang';

describe('parseRholangContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'contract bar(@Nil) { }',
      'contract foo(@Nil) {',
      '  bar(*Nil)',
      '}'
    ].join('\n');
    const graph = parseRholangContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
