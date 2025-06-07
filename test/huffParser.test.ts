import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseHuffContract } from '../src/languages/huff';

describe('parseHuffContract', () => {
  it('parses macros and edges', () => {
    const code = [
      '#define macro BAR() = takes(0) returns(0) {',
      '  0x00',
      '}',
      '',
      '#define macro FOO() = takes(0) returns(0) {',
      '  BAR()',
      '}',
    ].join('\n');
    const graph = parseHuffContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['BAR', 'FOO']);
    expect(graph.edges).to.deep.equal([{ from: 'FOO', to: 'BAR', label: '' }]);
  });
});
