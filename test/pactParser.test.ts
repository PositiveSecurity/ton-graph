import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parsePactContract } from '../src/languages/pact';

describe('parsePactContract', () => {
  it('parses functions and edges', () => {
    const code = [
      '(defun bar () (format "hello"))',
      '(defun foo ()',
      '  (bar))'
    ].join('\n');
    const graph = parsePactContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });
});
