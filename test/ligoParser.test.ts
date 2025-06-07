import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseLigoContract } from '../src/languages/ligo';

describe('parseLigoContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'function bar() : unit is {',
      '  skip;',
      '}',
      'function foo() : unit is {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseLigoContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
