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
} from '../src/parser/tolkParser';

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
});
