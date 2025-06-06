import * as path from 'path';
import * as vscode from 'vscode';
import { ContractGraph, ContractNode, GraphEdge } from '../../types/graph';
import { GraphNodeKind } from '../../types/graphNodeKind';

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

export interface FunctionDeclaration {
    name: string;
    isGet: boolean;
    decorators: Set<string>;
    lineIndex: number;
}

export interface TolkFunctionInfo {
    id: string;
    params: string;
    body: string;
    decorators: Set<string>;
    isGet: boolean;
    type: string;
}

/**
 * Finds function declarations within the given lines of code.
 * @param lines Array of source code lines.
 * @param globalVariables Set of global variable names to exclude.
 * @returns Discovered function declarations with metadata.
 */
export function findFunctionDeclarations(lines: string[], globalVariables: Set<string>): FunctionDeclaration[] {
    const declarations: FunctionDeclaration[] = [];
    for (let i = 0; i < lines.length; i++) {
        const funcDeclMatch = /(?:@([a-zA-Z_]+)\s+)*\b(?:(get)\s+(?:fun\s+)?|fun\s+)([a-zA-Z_][a-zA-Z0-9_]*)/.exec(lines[i]);
        if (funcDeclMatch) {
            const isGet = !!funcDeclMatch[2];
            const funcName = funcDeclMatch[3];

            const decorators = new Set<string>();
            const currentLine = lines[i];

            let decoratorMatch: RegExpExecArray | null;
            const decoratorRegex = /@([a-zA-Z_]+)/g;
            while ((decoratorMatch = decoratorRegex.exec(currentLine)) !== null) {
                decorators.add(decoratorMatch[1]);
            }

            let prevIndex = i - 1;
            while (prevIndex >= 0 && lines[prevIndex].trim().startsWith('@') && !lines[prevIndex].includes('fun')) {
                const prevDecorators = lines[prevIndex].match(/@([a-zA-Z_]+)/g) || [];
                for (const dec of prevDecorators) {
                    decorators.add(dec.substring(1));
                }
                prevIndex--;
            }

            if (BUILT_IN_FUNCTIONS.has(funcName) || globalVariables.has(funcName)) {
                continue;
            }

            declarations.push({ name: funcName, isGet, decorators, lineIndex: i });
        }
    }
    return declarations;
}

/**
 * Parses the parameter list of a function declaration.
 * @param lines Array of source code lines.
 * @param startLine Line index where the declaration begins.
 * @returns Parameter string and the line index where the declaration ends.
 */
export function parseParameters(lines: string[], startLine: number): { params: string; endLine: number } {
    let fullDeclaration = lines[startLine];
    let lineIndex = startLine;
    let openParens = (fullDeclaration.match(/\(/g) || []).length;
    let closeParens = (fullDeclaration.match(/\)/g) || []).length;

    while (openParens > closeParens && lineIndex + 1 < lines.length) {
        lineIndex++;
        fullDeclaration += '\n' + lines[lineIndex];
        openParens += (lines[lineIndex].match(/\(/g) || []).length;
        closeParens += (lines[lineIndex].match(/\)/g) || []).length;
    }

    const paramMatch = /\((.*?)\)(?:\s*:\s*[^{;]+)?/.exec(fullDeclaration);
    const params = paramMatch ? paramMatch[1] : '';
    return { params, endLine: lineIndex };
}

/**
 * Extracts the body of a function starting from a given line.
 * @param lines Array of source code lines.
 * @param fromLine Line index where the search for the body should start.
 * @returns Function body text and whether it is an asm function.
 */
export function extractBody(lines: string[], fromLine: number): { body: string; isAsm: boolean } {
    let bodyText = '';
    let isAsm = false;
    for (let j = fromLine; j < lines.length; j++) {
        if (lines[j].includes('{')) {
            const startLine = lines[j];
            if (startLine.includes('}') && startLine.indexOf('{') < startLine.indexOf('}')) {
                const match = /{([^}]*)}/.exec(startLine);
                bodyText = match ? match[1] : '';
                break;
            }
            let braceCount = 1;
            const bodyLines: string[] = [];
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
            isAsm = true;
            const asmLine = lines[j];
            const stringMatches = asmLine.match(/("[^"]*"|'[^']*')/g) || [];
            bodyText = stringMatches.join(' ');
            break;
        }
    }
    return { body: bodyText, isAsm };
}

/**
 * Determines the type of a function based on decorators and modifiers.
 * @param isGet Indicates if the function is declared with the `get` keyword.
 * @param decorators Set of decorators applied to the function.
 * @returns Normalized function type string.
 */
export function determineFunctionType(isGet: boolean, decorators: Set<string>): string {
    if (isGet) {
        return 'get';
    }
    if (decorators.has('pure')) {
        return 'pure_fun';
    }
    if (decorators.has('inline')) {
        return 'inline_fun';
    }
    return 'fun';
}

/**
 * Analyzes calls between discovered functions and returns graph edges.
 * @param functions Map of function information keyed by function name.
 * @returns Array of edges representing function calls.
 */
export function analyzeFunctionCalls(functions: Map<string, TolkFunctionInfo>): GraphEdge[] {
    const edges: GraphEdge[] = [];
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
                    edges.push({ from: funcName, to: calledFuncName, label: '' });
                    addedEdges.add(edgeKey);
                }
            }
        }

        callRegex.lastIndex = 0;
    });

    return edges;
}

export async function parseTolkContract(code: string): Promise<ContractGraph> {
    const graph: ContractGraph = { nodes: [], edges: [] };

    let contractName = 'Contract';
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const fileName = path.basename(editor.document.fileName);
        contractName = fileName.split('.')[0];
    }

    const normalizedCode = code.replace(/\r\n/g, '\n');
    const cleanedCode = removeCommentsFromCode(normalizedCode);

    const globalVariables = identifyGlobalVariables(cleanedCode);
    const lines = cleanedCode.split('\n');

    const declarations = findFunctionDeclarations(lines, globalVariables);
    const functions = new Map<string, TolkFunctionInfo>();

    for (const decl of declarations) {
        const { params, endLine } = parseParameters(lines, decl.lineIndex);
        const { body } = extractBody(lines, endLine);
        const type = determineFunctionType(decl.isGet, decl.decorators);
        functions.set(decl.name, {
            id: decl.name,
            params,
            body,
            decorators: decl.decorators,
            isGet: decl.isGet,
            type
        });
    }

    functions.forEach(func => {
        const node: ContractNode = {
            id: func.id,
            label: `${func.id}(${func.params})`,
            type: GraphNodeKind.Function,
            contractName,
            parameters: func.params.split(',').map(p => p.trim()).filter(p => p),
            functionType: func.type as any
        };
        graph.nodes.push(node);
    });

    graph.edges.push(...analyzeFunctionCalls(functions));

    return graph;
}
