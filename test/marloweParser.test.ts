import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseMarloweContract } from '../src/languages/marlowe';

describe('parseMarloweContract', () => {
  it('parses contracts and edges', () => {
    const code = [
      'contract Bar() {}',
      'contract Foo() {',
      '  when Notify -> Bar();',
      '}'
    ].join('\n');
    const graph = parseMarloweContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['Bar', 'Foo']);
    expect(graph.edges).to.deep.equal([{ from: 'Foo', to: 'Bar', label: '' }]);
  });
});
