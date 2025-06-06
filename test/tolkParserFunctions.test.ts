import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import * as fs from 'fs';
import * as path from 'path';
import {
    findFunctionDeclarations,
    parseParameters,
    extractBody,
    determineFunctionType,
    analyzeFunctionCalls,
    TolkFunctionInfo
} from '../src/languages/func/tolkParser';


describe('Tolk parser helper functions', () => {
    const code = fs.readFileSync(path.join(__dirname, 'tolk_sample.tolk'), 'utf-8');
    const lines = code.replace(/\r\n/g, '\n').split('\n');

    it('finds function declarations', () => {
        const decls = findFunctionDeclarations(lines, new Set());
        const names = decls.map(d => d.name);
        expect(names).to.include('foo');
        expect(names).to.include('bar');
    });

    it('extracts parameters and body', () => {
        const decls = findFunctionDeclarations(lines, new Set());
        const foo = decls.find(d => d.name === 'foo')!;
        const { params, endLine } = parseParameters(lines, foo.lineIndex);
        const { body } = extractBody(lines, endLine);
        expect(params).to.equal('');
        expect(body.trim()).to.equal('bar();');
    });

    it('determines function type', () => {
        const type = determineFunctionType(false, new Set());
        expect(type).to.equal('fun');
    });

    it('analyzes function calls', () => {
        const decls = findFunctionDeclarations(lines, new Set());
        const functions = new Map<string, TolkFunctionInfo>();
        for (const d of decls) {
            const { params, endLine } = parseParameters(lines, d.lineIndex);
            const { body } = extractBody(lines, endLine);
            functions.set(d.name, {
                id: d.name,
                params,
                body,
                decorators: d.decorators,
                isGet: d.isGet,
                type: determineFunctionType(d.isGet, d.decorators)
            });
        }
        const edges = analyzeFunctionCalls(functions);
        expect(edges).to.deep.include({ from: 'foo', to: 'bar', label: '' });
    });

    it('ignores built-in function declarations', () => {
        const code = 'fun foo() { sendRawMessage(); }\nfun sendRawMessage() {}';
        const linesBuiltIn = code.split('\n');
        const decls = findFunctionDeclarations(linesBuiltIn, new Set());
        const names = decls.map(d => d.name);
        expect(names).to.include('foo');
        expect(names).to.not.include('sendRawMessage');
    });

    it('handles multi-line decorators', () => {
        const code = '@pure\n@inline\nfun deco() {}';
        const linesDecorators = code.split('\n');
        const decls = findFunctionDeclarations(linesDecorators, new Set());
        const deco = decls.find(d => d.name === 'deco')!;
        expect(Array.from(deco.decorators)).to.have.members(['pure', 'inline']);
    });

    it('skips commented-out calls and semicolon-prefixed calls', () => {
        const source = `fun foo() {\n    //bar();\n    bar();\n    x = 1; baz();\n}\nfun bar() {}\nfun baz() {}`;
        const callLines = source.split('\n');
        const decls = findFunctionDeclarations(callLines, new Set());
        const functions = new Map<string, TolkFunctionInfo>();
        for (const d of decls) {
            const { params, endLine } = parseParameters(callLines, d.lineIndex);
            const { body } = extractBody(callLines, endLine);
            functions.set(d.name, {
                id: d.name,
                params,
                body,
                decorators: d.decorators,
                isGet: d.isGet,
                type: determineFunctionType(d.isGet, d.decorators)
            });
        }
        const edges = analyzeFunctionCalls(functions);
        expect(edges).to.deep.include({ from: 'foo', to: 'bar', label: '' });
        expect(edges.some(e => e.to === 'baz')).to.be.false;
    });

    it('determines all function types', () => {
        expect(determineFunctionType(true, new Set())).to.equal('get');
        expect(determineFunctionType(false, new Set(['pure']))).to.equal('pure_fun');
        expect(determineFunctionType(false, new Set(['inline']))).to.equal('inline_fun');
        expect(determineFunctionType(false, new Set(['pure', 'inline']))).to.equal('pure_fun');
    });
});
