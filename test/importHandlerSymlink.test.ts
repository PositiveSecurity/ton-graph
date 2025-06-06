import { expect } from 'chai';
import mock = require('mock-require');
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const baseDir = __dirname;
mock('vscode', {
    window: { createOutputChannel: () => ({ appendLine: () => {} }) },
    workspace: { workspaceFolders: [{ uri: { fsPath: baseDir } }] }
});

import { processFuncImports } from '../src/languages/func/importHandler';

describe('symlink security', () => {
    it('throws when symlink escapes workspace', async () => {
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkout-'));
        const outsideFile = path.join(outsideDir, 'o.fc');
        fs.writeFileSync(outsideFile, 'out');

        const testDir = path.join(baseDir, 'symlinkOut');
        fs.rmSync(testDir, { recursive: true, force: true });
        fs.mkdirSync(testDir, { recursive: true });
        const link = path.join(testDir, 'link.fc');
        fs.symlinkSync(outsideFile, link);

        const code = '#include "link.fc"';
        try {
            await processFuncImports(code, path.join(testDir, 'main.fc'));
            expect.fail('should throw');
        } catch (err: any) {
            expect(err.message).to.match(/symbolic link outside workspace/i);
        }
    });
});
