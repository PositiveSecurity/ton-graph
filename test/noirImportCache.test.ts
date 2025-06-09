import { expect } from 'chai';
import mock = require('mock-require');

let changeCb: any;

beforeEach(() => {
  changeCb = undefined;
  mock('vscode', {
    window: { createOutputChannel: () => ({ appendLine: () => {} }) },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/proj' } }],
      onDidChangeTextDocument: (cb: any) => { changeCb = cb; },
      onDidDeleteFiles: () => {},
    },
  });
});


describe('Noir import cache', () => {
  afterEach(() => {
    mock.stop('fs');
    mock.stop('../src/parser/parserUtils');
    mock.stop('vscode');
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

  it('reloads modules when files change', async () => {
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

    files['/proj/src/utils/helper.nr'] = 'pub fn triple() {}';
    changeCb({ document: { uri: { toString: () => 'file:///proj/src/utils/helper.nr', fsPath: '/proj/src/utils/helper.nr' }, fileName: '/proj/src/utils/helper.nr' } });

    await parserUtils.parseContractWithImports(code, '/proj/src/main.nr', 'noir');
    expect(reads).to.equal(4);
  });
});
