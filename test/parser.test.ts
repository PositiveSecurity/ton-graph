import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import {
    parseContractByLanguage,
    detectLanguage,
    getFunctionTypeFilters,
    parseContractWithImports
} from '../src/parser/parserUtils';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

describe('Parser', () => {
    it('parses FunC sample', async () => {
        const code = fs.readFileSync(path.join(__dirname, 'func_sample.fc'), 'utf-8');
        const graph = await parseContractByLanguage(code, 'func');
        expect(graph.nodes.length).to.equal(3);
        expect(graph.edges.length).to.equal(3);
    });

    it('parses Tact sample', async () => {
        const code = fs.readFileSync(path.join(__dirname, 'tact_sample.tact'), 'utf-8');
        const graph = await parseContractByLanguage(code, 'tact');
        expect(graph.nodes.length).to.equal(4);
        expect(graph.edges.length).to.equal(3);
    });

    it('parses Tolk sample', async () => {
        const code = fs.readFileSync(path.join(__dirname, 'tolk_sample.tolk'), 'utf-8');
        const graph = await parseContractByLanguage(code, 'tolk');
        expect(graph.nodes.length).to.equal(2);
        expect(graph.edges.length).to.equal(1);
    });

    const cases = [
        {
            desc: 'empty FunC',
            code: '',
            lang: 'func',
            nodes: 0,
            edges: 0
        },
        {
            desc: 'empty Tact',
            code: '',
            lang: 'tact',
            nodes: 0,
            edges: 0
        },
        {
            desc: 'empty Tolk',
            code: '',
            lang: 'tolk',
            nodes: 0,
            edges: 0
        },
        {
            desc: 'FunC nested comments',
            code: '/* outer /* inner */ outer */\nint main() { return 1; }',
            lang: 'func',
            nodes: 1,
            edges: 0
        },
        {
            desc: 'Tact nested comments',
            code: 'fun foo() { /* comment /* nested */ */ }',
            lang: 'tact',
            nodes: 1,
            edges: 0
        },
        {
            desc: 'Tolk exotic decorators',
            code: '@pure @inline fun foo() { }',
            lang: 'tolk',
            nodes: 1,
            edges: 0
        },
        {
            desc: 'malformed FunC',
            code: 'int a(',
            lang: 'func',
            nodes: 0,
            edges: 0
        },
        {
            desc: 'malformed Tact',
            code: 'fun b( {',
            lang: 'tact',
            nodes: 0,
            edges: 0
        },
        {
            desc: 'malformed Tolk',
            code: 'fun',
            lang: 'tolk',
            nodes: 0,
            edges: 0
        }
    ];

    for (const c of cases) {
        it(`handles ${c.desc}`, async () => {
            const graph = await parseContractByLanguage(c.code, c.lang as any);
            expect(graph.nodes.length).to.equal(c.nodes);
            expect(graph.edges.length).to.equal(c.edges);
        });
    }

    it('detects language from extension', () => {
        expect(detectLanguage('a.tact')).to.equal('tact');
        expect(detectLanguage('a.tolk')).to.equal('tolk');
        expect(detectLanguage('a.fc')).to.equal('func');
        expect(detectLanguage('Move.toml')).to.equal('move');
        expect(detectLanguage('a.simp')).to.equal('simplicity');
        // case-insensitive detection
        expect(detectLanguage('b.TACT')).to.equal('tact');
    });

    it('provides function type filters per language', () => {
        expect(getFunctionTypeFilters('func')[0].value).to.equal('impure');
        expect(getFunctionTypeFilters('tact')[0].value).to.equal('init');
        expect(getFunctionTypeFilters('tolk')[0].value).to.equal('fun');
        const moveFilters = getFunctionTypeFilters('move').map(f => f.value);
        expect(moveFilters).to.include('entry');
        expect(moveFilters).to.include('script');
    });

    it('parses contract with imports', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imports-'));
        const lib = path.join(tmp, 'lib.fc');
        fs.writeFileSync(lib, 'int lib() { return 1; }');
        const main = path.join(tmp, 'main.fc');
        fs.writeFileSync(main, '#include "lib.fc"\nint main() { lib(); }');
        const code = fs.readFileSync(main, 'utf8');
        mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) }, workspace: { workspaceFolders: [{ uri: { fsPath: tmp } }] } });
        delete require.cache[require.resolve('../src/languages/func/importHandler')];
        delete require.cache[require.resolve('../src/parser/parserUtils')];
        const { parseContractWithImports: parseWithImports } = require('../src/parser/parserUtils');
        const graph = await parseWithImports(code, main, 'func');
        const ids = graph.nodes.map((n: any) => n.id);
        expect(ids).to.include.members(['lib', 'main']);
    });

    it('parses Move project with Move.toml', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'moveproj-'));
        fs.writeFileSync(path.join(tmp, 'Move.toml'), '[package]\nname="Test"\n\n[dependencies]\ndep = { local = "./dep" }');
        fs.writeFileSync(path.join(tmp, 'A.move'), 'module A { use B; use C; public fun a() { B::b(); C::c(); } }');
        fs.writeFileSync(path.join(tmp, 'B.move'), 'module B { public fun b() {} }');
        fs.mkdirSync(path.join(tmp, 'dep'), { recursive: true });
        fs.writeFileSync(path.join(tmp, 'dep', 'C.move'), 'module C { public fun c() {} }');
        const code = fs.readFileSync(path.join(tmp, 'A.move'), 'utf8');
        mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) }, workspace: { workspaceFolders: [{ uri: { fsPath: tmp } }] } });
        delete require.cache[require.resolve('../src/parser/parserUtils')];
        const { parseContractWithImports: parseWithImports } = require('../src/parser/parserUtils');
        const graph = await parseWithImports(code, path.join(tmp, 'A.move'), 'move');
        const ids = graph.nodes.map((n: any) => n.id);
        expect(ids).to.include.members(['A::a', 'B::b', 'C::c']);
        expect(graph.edges).to.deep.include({ from: 'A::a', to: 'B::b', label: '' });
        expect(graph.edges).to.deep.include({ from: 'A::a', to: 'C::c', label: '' });
    });

    it('skips dependencies outside workspace', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'moveout-'));
        const external = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-'));
        const rel = path.relative(tmp, external).replace(/\\/g, '/');
        fs.writeFileSync(
            path.join(tmp, 'Move.toml'),
            `[package]\nname="Test"\n\n[dependencies]\nexternal = { local = "${rel}" }`
        );
        fs.writeFileSync(path.join(tmp, 'A.move'), 'module A { public fun a() {} }');
        fs.writeFileSync(path.join(external, 'B.move'), 'module B { public fun b() {} }');
        const code = fs.readFileSync(path.join(tmp, 'A.move'), 'utf8');
        mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) }, workspace: { workspaceFolders: [{ uri: { fsPath: tmp } }] } });
        delete require.cache[require.resolve('../src/parser/parserUtils')];
        const { parseContractWithImports: parseWithImports } = require('../src/parser/parserUtils');
        const graph = await parseWithImports(code, path.join(tmp, 'A.move'), 'move');
        const ids = graph.nodes.map((n: any) => n.id);
        expect(ids).to.deep.equal(['A::a']);
    });

    it('parses Move.toml with multiple dependencies and comments', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'movemulti-'));
        fs.mkdirSync(path.join(tmp, 'dep1'), { recursive: true });
        fs.mkdirSync(path.join(tmp, 'dep2'), { recursive: true });
        fs.writeFileSync(
            path.join(tmp, 'Move.toml'),
            `[package]\nname="Test"\n\n[dependencies]\n` +
            `dep1 = { local = "./dep1" } # first\n` +
            `# middle comment\n` +
            `dep2 = { local = "./dep2" }\n`
        );
        fs.writeFileSync(path.join(tmp, 'A.move'), 'module A { use D; use E; public fun a() { D::d(); E::e(); } }');
        fs.writeFileSync(path.join(tmp, 'dep1', 'D.move'), 'module D { public fun d() {} }');
        fs.writeFileSync(path.join(tmp, 'dep2', 'E.move'), 'module E { public fun e() {} }');
        const code = fs.readFileSync(path.join(tmp, 'A.move'), 'utf8');
        mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) }, workspace: { workspaceFolders: [{ uri: { fsPath: tmp } }] } });
        mock('toml', { parse: (str: string) => {
            const deps: any = {};
            const section = /\[dependencies\]([\s\S]*?)(?:\n\[|$)/i.exec(str);
            if (section) {
                for (const line of section[1].split(/\n/)) {
                    const m = line.match(/^(\w+)\s*=\s*{[^}]*local\s*=\s*"([^"]+)"/);
                    if (m) deps[m[1]] = { local: m[2] };
                }
            }
            return { dependencies: deps };
        }});
        delete require.cache[require.resolve('../src/parser/parserUtils')];
        const { parseContractWithImports: parseWithImports } = require('../src/parser/parserUtils');
        const graph = await parseWithImports(code, path.join(tmp, 'A.move'), 'move');
        const ids = graph.nodes.map((n: any) => n.id);
        expect(ids).to.include.members(['A::a', 'D::d', 'E::e']);
        mock.stop('toml');
    });
});
