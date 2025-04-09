import * as path from 'path';
import * as vscode from 'vscode';
import { ContractGraph, GraphNode } from '../types/graph';

// List of built-in functions to exclude
const BUILT_IN_FUNCTIONS = new Set([
    // Control flow
    'if', 'elseif', 'else', 'while', 'do', 'repeat', 'for', 'return', 'throw', 'require',
    // Standard built-ins
    'min', 'max', 'abs', 'now', 'myAddress', 'sender', 'beginString', 'beginCell',
    'beginDict', 'emptyMap', 'toString', 'toInt', 'toSlice', 'toString', 'toCell'
]);

// Function to remove comments from code
function removeCommentsFromCode(code: string): string {
    // Remove full-line comments starting with '//'
    let result = code.replace(/^\s*(\/\/).*$/gm, '');
    // Remove multi-line comments if any
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
}

// Function to extract all contract names from Tact code
function extractContractNames(code: string): string[] {
    const contractNames: string[] = [];
    const contractPattern = /contract\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = contractPattern.exec(code)) !== null) {
        if (match[1]) {
            contractNames.push(match[1]);
        }
    }

    return contractNames;
}

// Find the contract name for a specific position in the code
function findContractForPosition(code: string, position: number, contractNames: string[]): string {
    const contractStartPositions: { name: string, startPos: number, endPos: number }[] = [];

    // Find all contract start positions
    for (const name of contractNames) {
        const contractRegex = new RegExp(`contract\\s+${name}[\\s\\S]*?{`, 'g');
        let contractMatch;

        while ((contractMatch = contractRegex.exec(code)) !== null) {
            const startPos = contractMatch.index;

            // Find the end of this contract by counting braces
            let braceCount = 1;
            let endPos = startPos + contractMatch[0].length;

            while (braceCount > 0 && endPos < code.length) {
                if (code[endPos] === '{') braceCount++;
                if (code[endPos] === '}') braceCount--;
                endPos++;
            }

            contractStartPositions.push({ name, startPos, endPos });
        }
    }

    // Find which contract contains this position
    for (const contract of contractStartPositions) {
        if (position > contract.startPos && position < contract.endPos) {
            return contract.name;
        }
    }

    // Default to first contract if we can't determine
    return contractNames.length > 0 ? contractNames[0] : "Unknown";
}

export async function parseTactContract(code: string): Promise<ContractGraph> {
    const graph: ContractGraph = {
        nodes: [],
        edges: []
    };

    // Process code by normalizing line breaks and removing comments
    const normalizedCode = code.replace(/\r\n/g, '\n');
    const cleanedCode = removeCommentsFromCode(normalizedCode);

    // Extract all contract names
    const contractNames = extractContractNames(cleanedCode);
    const multipleContracts = contractNames.length > 1;

    // Find all function declarations
    const functions = new Map<string, {
        id: string,
        params: string,
        body: string,
        type: string,
        contractName: string
    }>();

    // Find function declarations for each type

    // 1. Init function
    const initPattern = /init\s*\(([^)]*)\)\s*{/g;
    let initMatch;
    while ((initMatch = initPattern.exec(cleanedCode)) !== null) {
        const params = initMatch[1] || '';
        const bodyStartPos = initMatch.index + initMatch[0].length;
        const contractName = findContractForPosition(cleanedCode, initMatch.index, contractNames);

        // Find the matching closing brace
        let braceCount = 1;
        let bodyEndPos = bodyStartPos;

        while (braceCount > 0 && bodyEndPos < cleanedCode.length) {
            if (cleanedCode[bodyEndPos] === '{') braceCount++;
            if (cleanedCode[bodyEndPos] === '}') braceCount--;
            bodyEndPos++;
        }

        if (braceCount > 0) continue; // Skip if no closing brace found

        const body = cleanedCode.slice(bodyStartPos, bodyEndPos - 1);

        // Create function ID with contract prefix if multiple contracts
        const functionId = multipleContracts ? `${contractName}::init` : 'init';

        // Add init function with a special name
        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'init',
            contractName
        });
    }

    // 2. Receive functions
    const receivePattern = /receive\s*\(([^)]*)\)\s*{/g;
    let receiveMatch;
    while ((receiveMatch = receivePattern.exec(cleanedCode)) !== null) {
        // Extract the message type from the parameter
        const params = receiveMatch[1] || '';
        const contractName = findContractForPosition(cleanedCode, receiveMatch.index, contractNames);
        let funcBaseName = 'receive';

        // Check for string literal patterns: receive("StringLiteral")
        const stringLiteralMatch = params.match(/^"([^"]+)"$/);
        if (stringLiteralMatch && stringLiteralMatch[1]) {
            funcBaseName = `receive_${stringLiteralMatch[1]}`;
        }
        // Check for named string parameters: receive(txt: "StringLiteral") or receive(string: "StringLiteral")
        else if (params.includes('"')) {
            const namedStringMatch = params.match(/(?:txt|string)\s*:\s*"([^"]+)"/);
            if (namedStringMatch && namedStringMatch[1]) {
                funcBaseName = `receive_${namedStringMatch[1]}`;
            }
        }
        // If not a string pattern, try the standard msg: MessageName pattern
        else {
            const msgNameMatch = params.match(/msg\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (msgNameMatch && msgNameMatch[1]) {
                funcBaseName = `receive_${msgNameMatch[1]}`;
            }
        }

        // Create function ID with contract prefix if multiple contracts
        const functionId = multipleContracts ? `${contractName}::${funcBaseName}` : funcBaseName;

        const bodyStartPos = receiveMatch.index + receiveMatch[0].length;

        // Find the matching closing brace
        let braceCount = 1;
        let bodyEndPos = bodyStartPos;

        while (braceCount > 0 && bodyEndPos < cleanedCode.length) {
            if (cleanedCode[bodyEndPos] === '{') braceCount++;
            if (cleanedCode[bodyEndPos] === '}') braceCount--;
            bodyEndPos++;
        }

        if (braceCount > 0) continue; // Skip if no closing brace found

        const body = cleanedCode.slice(bodyStartPos, bodyEndPos - 1);

        // Add receive function
        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'receive',
            contractName
        });
    }

    // 3. Get functions
    const getPattern = /get\s+fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?\s*{/g;
    let getMatch;
    while ((getMatch = getPattern.exec(cleanedCode)) !== null) {
        const funcName = getMatch[1];
        const params = getMatch[2] || '';
        const contractName = findContractForPosition(cleanedCode, getMatch.index, contractNames);

        // Skip built-in functions
        if (BUILT_IN_FUNCTIONS.has(funcName)) {
            continue;
        }

        const bodyStartPos = getMatch.index + getMatch[0].length;

        // Find the matching closing brace
        let braceCount = 1;
        let bodyEndPos = bodyStartPos;

        while (braceCount > 0 && bodyEndPos < cleanedCode.length) {
            if (cleanedCode[bodyEndPos] === '{') braceCount++;
            if (cleanedCode[bodyEndPos] === '}') braceCount--;
            bodyEndPos++;
        }

        if (braceCount > 0) continue; // Skip if no closing brace found

        const body = cleanedCode.slice(bodyStartPos, bodyEndPos - 1);

        // Add get function - ensure ID doesn't have spaces
        const getBaseId = `get_fun_${funcName}`;
        const functionId = multipleContracts ? `${contractName}::${getBaseId}` : getBaseId;

        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'get_fun',
            contractName
        });
    }

    // 4. Regular functions
    const funPattern = /(?<!get\s+)fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?\s*{/g;
    let funMatch;
    while ((funMatch = funPattern.exec(cleanedCode)) !== null) {
        const funcName = funMatch[1];
        const params = funMatch[2] || '';
        const contractName = findContractForPosition(cleanedCode, funMatch.index, contractNames);

        // Skip built-in functions
        if (BUILT_IN_FUNCTIONS.has(funcName)) {
            continue;
        }

        const bodyStartPos = funMatch.index + funMatch[0].length;

        // Find the matching closing brace
        let braceCount = 1;
        let bodyEndPos = bodyStartPos;

        while (braceCount > 0 && bodyEndPos < cleanedCode.length) {
            if (cleanedCode[bodyEndPos] === '{') braceCount++;
            if (cleanedCode[bodyEndPos] === '}') braceCount--;
            bodyEndPos++;
        }

        if (braceCount > 0) continue; // Skip if no closing brace found

        const body = cleanedCode.slice(bodyStartPos, bodyEndPos - 1);

        // Add regular function
        const functionId = multipleContracts ? `${contractName}::${funcName}` : funcName;

        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'fun',
            contractName
        });
    }

    // Create nodes for each function
    functions.forEach((func, name) => {
        // For get_fun functions, we need to display only the base name in the label
        let displayName = name;

        if (multipleContracts) {
            // Extract contract and function name from the ID
            const parts = name.split("::");
            if (parts.length === 2) {
                const contractName = parts[0];
                let funcName = parts[1];

                // Remove get_fun_ prefix if present
                if (funcName.startsWith('get_fun_')) {
                    funcName = funcName.substring(8);
                }

                displayName = `${contractName}::${funcName}`;
            }
        } else if (name.startsWith('get_fun_')) {
            displayName = name.substring(8); // Remove 'get_fun_' prefix for display
        }

        const node: GraphNode = {
            id: name,
            label: `${displayName}(${func.params})`,
            type: 'function',
            contractName: func.contractName,
            parameters: func.params.split(',').map(p => p.trim()).filter(p => p),
            functionType: func.type.replace(/\s+/g, '_') as any
        };
        graph.nodes.push(node);
    });

    // Second pass: analyze function calls
    functions.forEach((func, funcName) => {
        const funcBody = func.body;
        const currentContractName = func.contractName;

        // Create a set to track already added edges to avoid duplicates
        const addedEdges = new Set<string>();

        // Check for calls to other functions
        functions.forEach((calledFunc, calledFuncName) => {
            if (funcName !== calledFuncName) {
                // Extract the base function name for matching
                let baseCalledFuncName = calledFuncName;
                let calledContractName = calledFunc.contractName;

                if (multipleContracts) {
                    // Handle contract::function format
                    const parts = calledFuncName.split("::");
                    if (parts.length === 2) {
                        calledContractName = parts[0];
                        baseCalledFuncName = parts[1];
                    }
                }

                if (baseCalledFuncName.startsWith('get_fun_')) {
                    baseCalledFuncName = baseCalledFuncName.substring(8); // Remove 'get_fun_' prefix
                }

                // Check for direct function calls (functionName())
                const pattern = new RegExp(`\\b${baseCalledFuncName}\\s*\\(`, 'g');
                let match;

                // Only add edge if the called function is in the same contract or explicitly qualified
                const isSameContract = currentContractName === calledContractName;
                const isExplicitCall = funcBody.includes(`${calledContractName}.${baseCalledFuncName}`);

                if (isSameContract || isExplicitCall) {
                    while ((match = pattern.exec(funcBody)) !== null) {
                        // Skip if it's an explicitly qualified call to another contract's function
                        const matchPos = match.index;
                        const prefixStart = Math.max(0, matchPos - calledContractName.length - 1);
                        const possiblePrefix = funcBody.substring(prefixStart, matchPos);

                        // If there's an explicit contract qualifier and it's not our contract, skip
                        if (possiblePrefix.endsWith(`${calledContractName}.`) && !isSameContract) {
                            continue;
                        }

                        // Create a unique key for this edge to avoid duplicates
                        const edgeKey = `${funcName}->${calledFuncName}`;

                        // Add edge if not already added
                        if (!addedEdges.has(edgeKey)) {
                            graph.edges.push({
                                from: funcName,
                                to: calledFuncName,
                                label: ''
                            });

                            addedEdges.add(edgeKey);
                            break;
                        }
                    }
                }

                // Check for self references like "self.funcName" - these are always in the same contract
                if (isSameContract) {
                    const selfPattern = new RegExp(`self\\.${baseCalledFuncName}\\s*\\(`, 'g');
                    while ((match = selfPattern.exec(funcBody)) !== null) {
                        // Create a unique key for this edge
                        const edgeKey = `${funcName}->${calledFuncName}`;

                        // Add edge if not already added
                        if (!addedEdges.has(edgeKey)) {
                            graph.edges.push({
                                from: funcName,
                                to: calledFuncName,
                                label: ''
                            });

                            addedEdges.add(edgeKey);
                            break;
                        }
                    }
                }

                // Also look for explicit cross-contract calls: "ContractName.functionName()"
                if (multipleContracts && !isSameContract) {
                    const crossContractPattern = new RegExp(`\\b${calledContractName}\\.${baseCalledFuncName}\\s*\\(`, 'g');
                    while ((match = crossContractPattern.exec(funcBody)) !== null) {
                        // Create a unique key for this edge
                        const edgeKey = `${funcName}->${calledFuncName}`;

                        // Add edge if not already added
                        if (!addedEdges.has(edgeKey)) {
                            graph.edges.push({
                                from: funcName,
                                to: calledFuncName,
                                label: ''
                            });

                            addedEdges.add(edgeKey);
                            break;
                        }
                    }
                }
            }
        });
    });

    // Make sure get_fun functions are added to the right cluster
    graph.nodes.forEach(node => {
        if (node.id.startsWith('get_fun_')) {
            // Place get functions in the main cluster
            node.contractName = 'Main';
        }
    });

    return graph;
} 