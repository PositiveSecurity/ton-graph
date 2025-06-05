import * as path from 'path';
import * as vscode from 'vscode';
import * as moo from 'moo';
import { ContractGraph, ContractNode } from '../types/graph';

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
    const graph: ContractGraph = { nodes: [], edges: [] };
    const contractName = vscode.window.activeTextEditor
        ? path.basename(vscode.window.activeTextEditor.document.fileName).split('.')[0]
        : 'Contract';

    const functions = new Map<string, { body: string; params: string }>();

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
            i++; // skip ')'
            while (i < tokens.length && tokens[i].type !== 'lbrace') i++;
            i++; // skip '{'
            const bodyStart = i;
            depth = 1;
            while (i < tokens.length && depth > 0) {
                if (tokens[i].type === 'lbrace') depth++;
                else if (tokens[i].type === 'rbrace') depth--;
                i++;
            }
            const bodyEnd = i - 1;
            const params = tokens.slice(paramsStart, paramsEnd).map(t => t.value).join('');
            const bodyText = tokens.slice(bodyStart, bodyEnd).map(t => t.value).join('');
            functions.set(name, { body: bodyText, params });
            const node: ContractNode = {
                id: name,
                label: `${name}(${params})`,
                type: 'function',
                contractName,
                parameters: params.split(',').map((p: string) => p.trim()).filter(Boolean),
                functionType: kind
            };
            graph.nodes.push(node);
        } else {
            i++;
        }
    }

    const functionNames = Array.from(functions.keys());
    const callRegex = new RegExp(`\\b(${functionNames.join('|')})\\s*\\(`, 'g');
    for (const [from, info] of functions) {
        const added = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = callRegex.exec(info.body)) !== null) {
            const to = m[1];
            if (to !== from && !added.has(to)) {
                graph.edges.push({ from, to, label: '' });
                added.add(to);
            }
        }
    }

    return graph;
}
