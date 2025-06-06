import { expect } from 'chai';
import mock = require('mock-require');

mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });

describe('parserUtils invalid inputs', () => {
  afterEach(() => {
    mock.stop('../src/languages/func/funcParser');
    delete require.cache[require.resolve('../src/parser/parserUtils')];
  });

  it('falls back to FunC parser for unknown language', async () => {
    delete require.cache[require.resolve('../src/parser/parserUtils')];
    let called = false;
    mock('../src/languages/func/funcParser', { parseContractCode: async () => { called = true; return { nodes: [], edges: [] }; } });
    const parserUtils = require('../src/parser/parserUtils');
    const res = await parserUtils.parseContractByLanguage('code', 'weird' as any);
    expect(called).to.be.true;
    expect(res).to.deep.equal({ nodes: [], edges: [] });
  });

  it('detects unknown extension as func', () => {
    delete require.cache[require.resolve('../src/parser/parserUtils')];
    const parserUtils = require('../src/parser/parserUtils');
    expect(parserUtils.detectLanguage('file.unknown')).to.equal('func');
  });
});
