import * as path from 'path';
import * as vscode from 'vscode';
import { ContractGraph, ContractNode } from '../types/graph';

// List of built-in functions to exclude
const BUILT_IN_FUNCTIONS = new Set([
    // Control flow
    'if', 'else', 'while', 'do', 'repeat', 'until', 'for', 'return', 'break', 'continue',
    // Standard library functions
    'getContractData', 'beginParse', 'loadAddress', 'loadUint', 'assertEndOfSlice',
    'setContractData', 'beginCell', 'storeSlice', 'storeUint', 'endCell',
    'isEndOfSlice', 'isSliceBitsEqual', 'random', 'randomizeByLogicalTime',
    'sendRawMessage'
]);

// Function to remove comments from code
function removeCommentsFromCode(code: string): string {
    // Remove full-line comments starting with '//'
    let result = code.replace(/^\s*(\/\/).*$/gm, '');
    // Remove multi-line comments if any
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
}

// Function to identify global variables in the contract
function identifyGlobalVariables(code: string): Set<string> {
    const globalVars = new Set<string>();

    // Regular expression to match global variable declarations in Tolk
    const globalRegex = /global\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[a-zA-Z_][a-zA-Z0-9_]*/g;

    let match;
    while ((match = globalRegex.exec(code)) !== null) {
        // Add the variable name to our set
        globalVars.add(match[1]);
    }

    return globalVars;
}

export async function parseTolkContract(code: string): Promise<ContractGraph> {
    const graph: ContractGraph = {
        nodes: [],
        edges: []
    };

    // Extract contract name from filename or use default
    let contractName = "Contract";
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const fileName = path.basename(editor.document.fileName);
        contractName = fileName.split('.')[0];
    }

    // Process code by normalizing line breaks and removing comments
    const normalizedCode = code.replace(/\r\n/g, '\n');
    const cleanedCode = removeCommentsFromCode(normalizedCode);

    // Identify global variables
    const globalVariables = identifyGlobalVariables(cleanedCode);

    // Find all function declarations
    const functions = new Map<string, { id: string, params: string, body: string, type: string }>();

    // Process the code line by line to better handle functions with complex param types
    const lines = cleanedCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
        // First look for function declarations
        const funcDeclMatch = /(?:@([a-zA-Z_]+)\s+)*\b(?:(get)\s+(?:fun\s+)?|fun\s+)([a-zA-Z_][a-zA-Z0-9_]*)/.exec(lines[i]);

        if (funcDeclMatch) {
            const decorator = funcDeclMatch[1] || '';
            const isGet = !!funcDeclMatch[2];
            const funcName = funcDeclMatch[3];

            // Find all decorators that appear before the function declaration (like @pure, @inline)
            // Look at the current line and possibly previous line for decorators
            let decorators = new Set<string>();
            const currentLine = lines[i];
            const prevLine = i > 0 ? lines[i - 1] : '';

            // Check current line for decorators
            let decoratorMatch;
            const decoratorRegex = /@([a-zA-Z_]+)/g;
            while ((decoratorMatch = decoratorRegex.exec(currentLine)) !== null) {
                decorators.add(decoratorMatch[1]);
            }

            // Check previous line if it contains only a decorator
            if (prevLine.trim().startsWith('@') && !prevLine.includes('fun')) {
                const prevDecorators = prevLine.match(/@([a-zA-Z_]+)/g) || [];
                for (const dec of prevDecorators) {
                    decorators.add(dec.substring(1)); // Remove the @ symbol
                }
            }

            // Skip built-in functions and identified global variables
            if (BUILT_IN_FUNCTIONS.has(funcName) || globalVariables.has(funcName)) {
                continue;
            }

            // Check if this function declaration spans multiple lines
            let fullDeclaration = lines[i];
            let lineIndex = i;
            let openParens = (fullDeclaration.match(/\(/g) || []).length;
            let closeParens = (fullDeclaration.match(/\)/g) || []).length;

            // If parentheses aren't balanced, look ahead to find the complete declaration
            while (openParens > closeParens && lineIndex + 1 < lines.length) {
                lineIndex++;
                fullDeclaration += '\n' + lines[lineIndex];
                openParens += (lines[lineIndex].match(/\(/g) || []).length;
                closeParens += (lines[lineIndex].match(/\)/g) || []).length;
            }

            // Extract parameters
            const paramMatch = /\((.*?)\)(?:\s*:\s*[^{;]+)?/.exec(fullDeclaration);
            const params = paramMatch ? paramMatch[1] : '';

            // Look ahead for function body or asm
            let bodyText = '';
            let isAsm = false;

            // Look for opening brace or asm keyword
            for (let j = lineIndex; j < lines.length; j++) {
                if (lines[j].includes('{')) {
                    // Regular function with braces
                    let braceCount = 1;
                    let bodyLines = [];

                    // Start from the line after the opening brace
                    for (let k = j + 1; k < lines.length && braceCount > 0; k++) {
                        braceCount += (lines[k].match(/{/g) || []).length;
                        braceCount -= (lines[k].match(/}/g) || []).length;

                        if (braceCount > 0) {
                            bodyLines.push(lines[k]);
                        }
                    }

                    bodyText = bodyLines.join('\n');
                    break;
                } else if (lines[j].includes('asm')) {
                    // Asm function
                    isAsm = true;
                    const asmLine = lines[j];
                    const stringMatches = asmLine.match(/("[^"]*"|'[^']*')/g) || [];
                    bodyText = stringMatches.join(' ');
                    break;
                }
            }

            // Skip functions without implementation
            if (!bodyText.trim()) {
                continue;
            }

            // Determine function type
            let funcType;
            if (isGet) {
                funcType = 'get';
            } else if (decorators.has('pure')) {
                funcType = 'pure_fun';
            } else if (decorators.has('inline')) {
                funcType = 'inline_fun';
            } else {
                funcType = 'fun';
            }

            functions.set(funcName, {
                id: funcName,
                params,
                body: bodyText,
                type: funcType
            });
        }
    }

    // Create nodes for each function
    functions.forEach((func, name) => {
        const node: ContractNode = {
            id: name,
            label: `${name}(${func.params})`,
            type: 'function',
            contractName,
            parameters: func.params.split(',').map(p => p.trim()).filter(p => p),
            functionType: func.type as any
        };
        graph.nodes.push(node);
    });

    // Second pass: analyze function calls without nested iterations
    const functionNames = Array.from(functions.keys()).sort((a, b) => b.length - a.length);
    const callRegex = new RegExp(`\\b(${functionNames.join('|')})\\s*\\(`, 'g');

    functions.forEach((func, funcName) => {
        const funcBody = func.body;
        const addedEdges = new Set<string>();
        let match: RegExpExecArray | null;

        while ((match = callRegex.exec(funcBody)) !== null) {
            const calledFuncName = match[1];
            if (calledFuncName && calledFuncName !== funcName) {
                const lineStart = funcBody.lastIndexOf('\n', match.index) + 1;
                const lineEnd = funcBody.indexOf('\n', match.index);
                const line = funcBody.substring(lineStart, lineEnd === -1 ? funcBody.length : lineEnd);
                const beforeMatch = line.substring(0, match.index - lineStart);
                if (beforeMatch.includes('//') || beforeMatch.includes(';')) {
                    continue;
                }

                const edgeKey = `${funcName}->${calledFuncName}`;
                if (!addedEdges.has(edgeKey)) {
                    graph.edges.push({
                        from: funcName,
                        to: calledFuncName,
                        label: ''
                    });
                    addedEdges.add(edgeKey);
                }
            }
        }

        callRegex.lastIndex = 0;
    });

    return graph;
} 