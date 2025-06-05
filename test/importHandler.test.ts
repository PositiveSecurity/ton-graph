import { expect } from 'chai';
import mock = require('mock-require');
import * as path from 'path';

const testRoot = __dirname;
mock('vscode', {
    window: { createOutputChannel: () => ({ appendLine: () => {} }) },
    workspace: { workspaceFolders: [{ uri: { fsPath: testRoot } }] }
});

import { processFuncImports } from '../src/parser/importHandler';

describe('ImportHandler', () => {
    it('rejects imports outside workspace', async () => {
        const code = '#include "../../etc/passwd"';
        const result = await processFuncImports(code, path.join(testRoot, 'dummy.fc'));
        expect(result.importedFilePaths.length).to.equal(0);
    });
});
