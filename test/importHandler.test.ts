import { expect } from 'chai';
import mock = require('mock-require');
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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

    it('rejects symlinked imports pointing outside workspace', async () => {
        const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-'));
        const externalFile = path.join(externalDir, 'outside.fc');
        fs.writeFileSync(externalFile, 'external content');

        const linkDir = path.join(testRoot, 'link');
        fs.mkdirSync(linkDir, { recursive: true });
        const linkPath = path.join(linkDir, 'link.fc');
        fs.symlinkSync(externalFile, linkPath);

        const code = '#include "link.fc"';
        const result = await processFuncImports(code, path.join(linkDir, 'dummy.fc'));
        expect(result.importedFilePaths.length).to.equal(0);
    });

    it('handles cyclic imports without throwing', async () => {
        const cycleDir = path.join(testRoot, 'cycle');
        fs.mkdirSync(cycleDir, { recursive: true });
        const aPath = path.join(cycleDir, 'a.fc');
        const bPath = path.join(cycleDir, 'b.fc');
        fs.writeFileSync(aPath, '#include "b.fc"');
        fs.writeFileSync(bPath, '#include "a.fc"');

        const code = fs.readFileSync(aPath, 'utf8');
        const result = await processFuncImports(code, aPath);
        expect(result.importedFilePaths).to.include(bPath);
        // Should not throw or loop endlessly
        expect(result.importedFilePaths.length).to.be.greaterThan(0);
    });
});
