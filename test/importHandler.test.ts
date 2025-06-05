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

import {
    processFuncImports,
    processTactImports,
    processTolkImports,
    processImports
} from '../src/parser/importHandler';

describe('ImportHandler', () => {
    afterEach(() => {
        mock.stopAll();
        delete require.cache[require.resolve('../src/parser/importHandler')];
    });
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

    it('rejects symlink import loops', async () => {
        const loopDir = path.join(testRoot, 'symlinkLoop');
        fs.mkdirSync(loopDir, { recursive: true });
        const aPath = path.join(loopDir, 'a.fc');
        fs.writeFileSync(aPath, '#include "b.fc"');
        const bPath = path.join(loopDir, 'b.fc');
        fs.symlinkSync(aPath, bPath);

        const code = fs.readFileSync(aPath, 'utf8');
        try {
            await processFuncImports(code, aPath);
            expect.fail('should throw due to symlink loop');
        } catch (err: any) {
            expect(err.message).to.match(/symlink loop/i);
        }
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

    it('processes Tact relative imports', async () => {
        const tactDir = path.join(testRoot, 'tactrel');
        fs.mkdirSync(tactDir, { recursive: true });
        const lib = path.join(tactDir, 'lib.tact');
        fs.writeFileSync(lib, 'fun lib() {}');
        const main = path.join(tactDir, 'main.tact');
        fs.writeFileSync(main, 'import "lib"; fun main() { lib(); }');
        const result = await processTactImports(fs.readFileSync(main, 'utf8'), main);
        expect(result.importedFilePaths).to.deep.equal([lib]);
    });

    it('processes Tolk relative imports', async () => {
        const tolkDir = path.join(testRoot, 'tolkrel');
        fs.mkdirSync(tolkDir, { recursive: true });
        const lib = path.join(tolkDir, 'lib.tolk');
        fs.writeFileSync(lib, 'fun lib() {}');
        const main = path.join(tolkDir, 'main.tolk');
        fs.writeFileSync(main, 'import "lib"; fun main() { lib(); }');
        const result = await processTolkImports(fs.readFileSync(main, 'utf8'), main);
        expect(result.importedFilePaths).to.deep.equal([lib]);
    });

    it('skips missing Tact package imports', async () => {
        const tactPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'tactpkg-'));
        const main = path.join(tactPkg, 'main.tact');
        fs.writeFileSync(main, 'import "@nope";');
        const res = await processTactImports(fs.readFileSync(main, 'utf8'), main);
        expect(res.importedFilePaths.length).to.equal(0);
    });

    it('skips missing Tolk package imports', async () => {
        const tolkPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'tolkpkg-'));
        const main = path.join(tolkPkg, 'main.tolk');
        fs.writeFileSync(main, 'import "@nope";');
        const res = await processTolkImports(fs.readFileSync(main, 'utf8'), main);
        expect(res.importedFilePaths.length).to.equal(0);
    });

    it('returns empty for unknown language', async () => {
        const res = await processImports('code', 'dummy', 'unknown');
        expect(res.importedFilePaths).to.deep.equal([]);
        expect(res.importedCode).to.equal('');
    });
});
