import { expect } from 'chai';
import mock = require('mock-require');

// stub vscode so workspace utilities function
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) }, workspace: { workspaceFolders: [{ uri: { fsPath: '/proj' } }] } });


describe('Noir import cache', () => {
  afterEach(() => {
    mock.stop('fs');
    mock.stop('../src/parser/parserUtils');
  });

  it('reads a module referenced twice only once', async () => {
    const files: Record<string, string> = {
      '/proj/src/main.nr': [
        'mod utils;',
        'use utils::helper;',
        'fn main() { helper::double(); }'
      ].join('\n'),
      '/proj/src/utils/mod.nr': 'pub mod helper;',
      '/proj/src/utils/helper.nr': 'pub fn double() {}',
    };

    let reads = 0;
    const fsStub = {
      promises: {
        access: async (p: string) => {
          if (!(p in files)) throw new Error('not found');
        },
        readFile: async (p: string, _e: string) => {
          reads++;
          if (!(p in files)) throw new Error('not found');
          return files[p];
        }
      },
      existsSync: (p: string) => p in files,
      readdirSync: () => []
    };

    mock('fs', fsStub);

    const parserUtils = require('../src/parser/parserUtils');

    const code = files['/proj/src/main.nr'];
    await parserUtils.parseContractWithImports(code, '/proj/src/main.nr', 'noir');
    expect(reads).to.equal(3);
  });
});
