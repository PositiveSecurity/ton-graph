import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseNoirContract } from '../src/languages/noir';

describe('parseNoirContract', () => {
  it('parses functions and edges', () => {
    const code = [
      'fn bar() {}',
      'fn foo() {',
      '  bar();',
      '}'
    ].join('\n');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });

  it('parses generic functions with nested control flow', () => {
    const code = [
      'fn inner<T>(x: T) {}',
      'fn outer() {',
      '  if true {',
      '    for i in 0..1 {',
      '      inner(i);',
      '    }',
      '  }',
      '}'
    ].join('\n');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include.members(['inner', 'outer']);
    expect(graph.edges).to.deep.equal([{ from: 'outer', to: 'inner', label: '' }]);
  });

  it('handles attribute macros or decorators', () => {
    const code = [
      '#[test]',
      'fn decorated() {}',
      'fn caller() {',
      '  decorated();',
      '}'
    ].join('\n');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include.members(['decorated', 'caller']);
    expect(graph.edges).to.deep.equal([{ from: 'caller', to: 'decorated', label: '' }]);
  });

  it('deduplicates duplicate function calls', () => {
    const code = [
      'fn callee() {}',
      'fn caller() {',
      '  callee();',
      '  callee();',
      '}'
    ].join('\n');
    const graph = parseNoirContract(code);
    expect(graph.edges).to.deep.equal([{ from: 'caller', to: 'callee', label: '' }]);
  });

  it('returns an empty graph for malformed code', () => {
    const graph = parseNoirContract('fn foo(');
    expect(graph.nodes).to.be.empty;
    expect(graph.edges).to.be.empty;
  });
});
