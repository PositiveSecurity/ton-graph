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
        expect(result.cycles.length).to.be.greaterThan(0);
    });

    it('merges nested imports in order', async () => {
        const nestedDir = path.join(testRoot, 'nested');
        fs.mkdirSync(nestedDir, { recursive: true });
        const level2 = path.join(nestedDir, 'level2.fc');
        const level1 = path.join(nestedDir, 'level1.fc');
        const main = path.join(nestedDir, 'main.fc');

        fs.writeFileSync(level2, 'int level2() { return 2; }');
        fs.writeFileSync(level1, `#include "level2.fc"\nint level1() { level2(); }`);
        fs.writeFileSync(main, `#include "level1.fc"\nint main() { level1(); }`);

        const code = fs.readFileSync(main, 'utf8');
        const result = await processFuncImports(code, main);

        const expected = [fs.readFileSync(level1, 'utf8'), fs.readFileSync(level2, 'utf8')].join('\n\n');
        expect(result.importedFilePaths).to.deep.equal([level1, level2]);
        expect(result.importedCode.trim()).to.equal(expected.trim());
    });

    it('uses async file reading', async () => {
        const asyncDir = path.join(testRoot, 'async');
        fs.mkdirSync(asyncDir, { recursive: true });
        const asyncFile = path.join(asyncDir, 'a.fc');
        fs.writeFileSync(asyncFile, 'int a() { return 1; }');

        const originalReadFile: any = fs.promises.readFile;
        let called = false;
        (fs.promises as any).readFile = async (...args: any[]): Promise<any> => {
            called = true;
            return originalReadFile(...args);
        };

        const code = fs.readFileSync(asyncFile, 'utf8');
        await processFuncImports(code, asyncFile);
        (fs.promises as any).readFile = originalReadFile;

        expect(called).to.be.true;
    });
});
