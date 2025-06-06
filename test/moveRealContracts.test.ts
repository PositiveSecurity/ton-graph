import { expect } from 'chai';
import fs from 'fs';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseMoveContract } from '../src/parser/moveParser';

function load(name: string) {
  return fs.readFileSync(`src/__tests__/move/${name}.move`, 'utf8');
}

describe('parseMoveContract real contracts', () => {
  it('Diem ChainId', async () => {
    const graph = await parseMoveContract(load('ChainId'));
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include('ChainId::initialize');
    expect(ids).to.include('ChainId::get');
    expect(graph.edges).to.deep.include.members([
      { from: 'ChainId::initialize', to: 'DiemTimestamp::assert_genesis', label: '' },
      { from: 'ChainId::initialize', to: 'CoreAddresses::assert_diem_root', label: '' }
    ]);
  });

  it('Sui example', async () => {
    const graph = await parseMoveContract(load('sui_example'));
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include('example::sword_create');
    expect(graph.edges).to.deep.include.members([
      { from: 'example::init', to: 'object::new', label: '' },
      { from: 'example::init', to: 'transfer::transfer', label: '' }
    ]);
  });

  it('Aptos token', async () => {
    const graph = await parseMoveContract(load('aptos_token'));
    const ids = graph.nodes.map(n => n.id);
    expect(ids).to.include('token::create_collection_script');
    expect(graph.edges).to.deep.include({ from: 'token::create_collection_script', to: 'token::create_collection', label: '' });
  });
});
