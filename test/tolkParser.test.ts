import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { activeTextEditor: undefined, createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseTolkContract } from '../src/languages/func/tolkParser';

describe('parseTolkContract', () => {
  it('parses functions and edges', async () => {
    const code = [
      'fun bar() {}',
      'fun foo() {',
      '  bar();',
      '}',
    ].join('\n');
    const graph = await parseTolkContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
