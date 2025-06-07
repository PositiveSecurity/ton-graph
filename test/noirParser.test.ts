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

  it('parses the hello.nr example file', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/hello.nr', 'utf8');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.have.members(['bar', 'foo']);
    expect(graph.edges).to.deep.equal([{ from: 'foo', to: 'bar', label: '' }]);
  });

  it('parses the complex.nr example file', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/complex.nr', 'utf8');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include.members([
      'hash_pair',
      'merkle_hash',
      'verify_merkle',
      'update_proposal',
      'record_vote',
      'aggregate_votes',
      'has_majority',
      'main'
    ]);
    expect(graph.edges).to.deep.equal([
      { from: 'merkle_hash', to: 'hash_pair', label: '' },
      { from: 'verify_merkle', to: 'merkle_hash', label: '' },
      { from: 'record_vote', to: 'verify_merkle', label: '' },
      { from: 'record_vote', to: 'update_proposal', label: '' },
      { from: 'main', to: 'record_vote', label: '' },
      { from: 'main', to: 'aggregate_votes', label: '' },
      { from: 'main', to: 'has_majority', label: '' }
    ]);
  });

  it('parses the module_call.nr example file', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/module_call.nr', 'utf8');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include.members(['Dummy::helper', 'Dummy::call']);
    expect(graph.edges).to.deep.include({ from: 'use_utils', to: 'utils::inc', label: '' });
    expect(graph.edges).to.deep.include({ from: 'Dummy::call', to: 'Dummy::helper', label: '' });
  });

  it('follows mod statements across files', async () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/import_main.nr', 'utf8');
    const parserUtils = require('../src/parser/parserUtils');
    const graph = await parserUtils.parseContractWithImports(code, 'examples/noir/import_main.nr', 'noir');
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::math::double', label: '' });
  });

  it('handles impl methods in external modules', async () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/impl_main.nr', 'utf8');
    const parserUtils = require('../src/parser/parserUtils');
    const graph = await parserUtils.parseContractWithImports(code, 'examples/noir/impl_main.nr', 'noir');
    const ids = graph.nodes.map((n: any) => n.id);
    expect(ids).to.include.members(['Dummy::helper', 'Dummy::call', 'main']);
    expect(graph.edges).to.deep.include({ from: 'Dummy::call', to: 'Dummy::helper', label: '' });
  });
});
