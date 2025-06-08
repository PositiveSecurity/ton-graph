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

  it('parses function parameters', () => {
    const code = [
      'fn add(x: Field, y: Field) -> Field {',
      '  x + y',
      '}',
    ].join('\n');
    const graph = parseNoirContract(code);
    const addNode = graph.nodes.find(n => n.id === 'add');
    expect(addNode?.parameters).to.deep.equal(['x', 'y']);
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
    expect(ids).to.include.members(['Dummy::helper', 'Dummy::call', 'utils::inc']);
    const incNode = graph.nodes.find(n => n.id === 'utils::inc');
    expect(incNode?.contractName).to.equal('utils');
    expect(graph.edges).to.deep.include({ from: 'use_utils', to: 'utils::inc', label: '' });
    expect(graph.edges).to.deep.include({ from: 'Dummy::call', to: 'Dummy::helper', label: '' });
  });

  it('resolves namespaced and method call paths', () => {
    const code = [
      'mod utils {',
      '  pub fn inc<T>(x: T) -> T { x }',
      '}',
      'struct Dummy {}',
      'impl Dummy {',
      '  fn call(self) {}',
      '}',
      'fn main() {',
      '  utils::inc::<Field>(5);',
      '  let d = Dummy {};',
      '  d.call();',
      '}',
    ].join('\n');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include('utils::inc');
    const incNode = graph.nodes.find(n => n.id === 'utils::inc');
    expect(incNode?.contractName).to.equal('utils');
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::inc', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'Dummy::call', label: '' });
  });

  it('resolves simple alias imports', () => {
    const code = [
      'mod utils {',
      '  pub fn inc(x: Field) -> Field { x }',
      '}',
      'use utils::inc as add_one;',
      'fn main() {',
      '  add_one(5);',
      '}',
    ].join('\n');
    const graph = parseNoirContract(code);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::inc', label: '' });
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

  it('parses generic methods in impl blocks', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/generic_impl.nr', 'utf8');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include.members(['Box::new', 'Box::get', 'main']);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'Box::new', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'Box::get', label: '' });
  });

  it('parses trait method implementations', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/trait_impl.nr', 'utf8');
    const graph = parseNoirContract(code);
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include.members(['Adder::sum', 'main']);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'Adder::sum', label: '' });
  });

  it('handles alias imports with nested paths', async () => {
    const fs = require('fs');
    const path = require('path');
    const parserUtils = require('../src/parser/parserUtils');
    const tmp = path.join('examples/noir', 'tmp_alias_main.nr');
    fs.writeFileSync(tmp, [
      'mod utils;',
      'use utils::math::double as dub;',
      'fn main() {',
      '  dub(2);',
      '}',
    ].join('\n'));
    const code = fs.readFileSync(tmp, 'utf8');
    const graph = await parserUtils.parseContractWithImports(code, tmp, 'noir');
    fs.unlinkSync(tmp);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::math::double', label: '' });
  });

  it('resolves calls through a module alias', async () => {
    const fs = require('fs');
    const parserUtils = require('../src/parser/parserUtils');
    const code = fs.readFileSync('examples/noir/alias_module.nr', 'utf8');
    const graph = await parserUtils.parseContractWithImports(code, 'examples/noir/alias_module.nr', 'noir');
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::math::double', label: '' });
  });

  it('parses grouped imports', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/group_import.nr', 'utf8');
    const graph = parseNoirContract(code);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::add', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::sub', label: '' });
  });

  it('parses wildcard imports', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/wildcard_import.nr', 'utf8');
    const graph = parseNoirContract(code);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::inc', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::dec', label: '' });
  });

  it('extracts parameters from methods and functions', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/params_example.nr', 'utf8');
    const graph = parseNoirContract(code);
    const act = graph.nodes.find(n => n.id === 'Dummy::act');
    const compute = graph.nodes.find(n => n.id === 'compute');
    expect(act?.parameters).to.deep.equal(['self', 'x', 'y']);
    expect(compute?.parameters).to.deep.equal(['a', 'b', 'c']);
  });

  it('handles grouped and wildcard use imports together', () => {
    const fs = require('fs');
    const code = fs.readFileSync('examples/noir/group_wildcard_import.nr', 'utf8');
    const graph = parseNoirContract(code);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::inc', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::dec', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::dbl', label: '' });
  });

  it('resolves modules from a Nargo project', async () => {
    const fs = require('fs');
    const path = require('path');
    const proj = path.resolve('examples/noir/nargo_example');
    mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) }, workspace: { workspaceFolders: [{ uri: { fsPath: proj } }] } });
    delete require.cache[require.resolve('../src/parser/parserUtils')];
    const parserUtils = require('../src/parser/parserUtils');
    const code = fs.readFileSync(path.join(proj, 'src', 'main.nr'), 'utf8');
    const graph = await parserUtils.parseContractWithImports(code, path.join(proj, 'src', 'main.nr'), 'noir');
    const ids = graph.nodes.map((n: any) => n.id);
    expect(ids).to.include.members(['utils::inc', 'helper::run', 'main']);
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::inc', label: '' });
    expect(graph.edges).to.deep.include({ from: 'main', to: 'helper::run', label: '' });
    mock.stop('vscode');
  });

  it('resolves crate-prefixed imports', async () => {
    const fs = require('fs');
    const parserUtils = require('../src/parser/parserUtils');
    const code = fs.readFileSync('examples/noir/crate_use.nr', 'utf8');
    const graph = await parserUtils.parseContractWithImports(code, 'examples/noir/crate_use.nr', 'noir');
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::math::double', label: '' });
  });

  it('handles nested module declarations', async () => {
    const fs = require('fs');
    const parserUtils = require('../src/parser/parserUtils');
    const code = fs.readFileSync('examples/noir/nested_mod.nr', 'utf8');
    const graph = await parserUtils.parseContractWithImports(code, 'examples/noir/nested_mod.nr', 'noir');
    expect(graph.edges).to.deep.include({ from: 'main', to: 'utils::math::double', label: '' });
  });
});
