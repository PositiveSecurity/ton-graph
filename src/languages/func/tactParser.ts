import * as path from 'path';
import * as vscode from 'vscode';
import * as moo from 'moo';
import { ContractGraph } from '../../types/graph';
import { ParsedFunction, buildFunctionGraph } from './functionGraphBuilder';

const lexer = moo.compile({
    ws: /[ \t\r]+/,
    comment: /\/\/.*?$/,
    mlcomment: { match: /\/\*[\s\S]*?\*\//, lineBreaks: true },
    string: /"(?:\\.|[^"\\])*"/,
    lparen: '(',
    rparen: ')',
    lbrace: '{',
    rbrace: '}',
    comma: ',',
    semicolon: ';',
    colon: ':',
    keyword: ['init', 'receive', 'fun', 'get'],
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,
    number: /0x[0-9a-fA-F]+|\d+/,
    newline: { match: /\n/, lineBreaks: true },
    other: /./
});

function tokenize(code: string) {
    lexer.reset(code);
    const tokens: moo.Token[] = [];
    let t;
    while ((t = lexer.next())) {
        if (t.type && ['ws', 'comment', 'mlcomment', 'newline'].includes(t.type)) {
            continue;
        }
        tokens.push(t);
    }
    return tokens;
}

export async function parseTactContract(code: string): Promise<ContractGraph> {
    const tokens = tokenize(code);
    const contractName = vscode.window.activeTextEditor
        ? path.basename(vscode.window.activeTextEditor.document.fileName).split('.')[0]
        : 'Contract';
    const functions = new Map<string, ParsedFunction>();

    let i = 0;
    while (i < tokens.length) {
        const tok = tokens[i];
        if (tok.type === 'keyword' && ['init', 'receive', 'fun', 'get'].includes(tok.value)) {
            let kind = tok.value;
            if (kind === 'get' && tokens[i + 1] && tokens[i + 1].value === 'fun') {
                kind = 'get_fun';
                i++;
            }
            i++;
            let name = kind;
            if (kind === 'fun' || kind === 'get_fun') {
                if (tokens[i] && tokens[i].type === 'identifier') {
                    name = tokens[i].value;
                    i++;
                }
            }
            while (i < tokens.length && tokens[i].type !== 'lparen') i++;
            if (i >= tokens.length) break;
            i++; // skip '('
            const paramsStart = i;
            let depth = 0;
            while (i < tokens.length) {
                if (tokens[i].type === 'lparen') depth++;
                if (tokens[i].type === 'rparen') {
                    if (depth === 0) break;
                    depth--;
                }
                i++;
            }
            const paramsEnd = i;
            if (i >= tokens.length || tokens[i].type !== 'rparen') continue;
            i++; // skip ')'
            while (i < tokens.length && tokens[i].type !== 'lbrace') i++;
            if (i >= tokens.length) break;
            i++; // skip '{'
            const bodyStart = i;
            depth = 1;
            while (i < tokens.length && depth > 0) {
                if (tokens[i].type === 'lbrace') depth++;
                else if (tokens[i].type === 'rbrace') depth--;
                i++;
            }
            if (depth !== 0) continue;
            const bodyEnd = i - 1;
            const params = tokens.slice(paramsStart, paramsEnd).map(t => t.value).join('');
            const bodyText = tokens.slice(bodyStart, bodyEnd).map(t => t.value).join('');
            functions.set(name, { name, params, body: bodyText, type: kind });
        } else {
            i++;
        }
    }

    return buildFunctionGraph(functions, contractName);
}
