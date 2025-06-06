import { expect } from 'chai';
import mock = require('mock-require');
import * as path from 'path';

const tmpDir = __dirname;
mock('vscode', {
  window: { createOutputChannel: () => ({ appendLine: () => {} }) },
  workspace: { workspaceFolders: [{ uri: { fsPath: tmpDir } }] }
});

import { processFuncImports } from '../src/languages/func/importHandler';

describe('processFuncImports missing file', () => {
  it('returns no imports when file missing', async () => {
    const res = await processFuncImports('#include "nope.fc"', path.join(tmpDir, 'a.fc'));
    expect(res.importedFilePaths.length).to.equal(0);
    expect(res.importedCode).to.equal('');
  });
});
