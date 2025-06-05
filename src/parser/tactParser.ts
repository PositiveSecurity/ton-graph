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

// Function to extract trait names from Tact code
function extractTraitNames(code: string): string[] {
    const traitNames: string[] = [];
    const traitPattern = /trait\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = traitPattern.exec(code)) !== null) {
        if (match[1]) {
            traitNames.push(match[1]);
        }
    }

    return traitNames;
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

// Map traits to contracts using them
function mapTraitsToContracts(code: string, contractNames: string[], traitNames: string[]): Map<string, string[]> {
    const traitToContractMap = new Map<string, string[]>();

    // Initialize map for each trait
    traitNames.forEach(trait => {
        traitToContractMap.set(trait, []);
    });

    // For each contract, check which traits it uses
    for (const contractName of contractNames) {
        // Look for "contract ContractName with ... Trait1, Trait2"
        const contractWithPattern = new RegExp(`contract\\s+${contractName}\\s+with\\s+([^{]+)`, 'i');
        const match = contractWithPattern.exec(code);

        if (match) {
            const withClause = match[1];

            // Check each trait if it's used by this contract
            traitNames.forEach(trait => {
                // Match the trait name as a word (surrounded by non-word chars or string boundaries)
                const traitPattern = new RegExp(`\\b${trait}\\b`, 'i');
                if (traitPattern.test(withClause)) {
                    const contracts = traitToContractMap.get(trait) || [];
                    contracts.push(contractName);
                    traitToContractMap.set(trait, contracts);
                }
            });
        }
    }

    return traitToContractMap;
}

// Find the contract name for a specific position in the code
function findContractForPosition(code: string, position: number, contractNames: string[], traitNames: string[], traitToContractMap: Map<string, string[]>): string {
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

    // Find all trait start positions
    const traitStartPositions: { name: string, startPos: number, endPos: number }[] = [];
    for (const name of traitNames) {
        const traitRegex = new RegExp(`trait\\s+${name}[\\s\\S]*?{`, 'g');
        let traitMatch;

        while ((traitMatch = traitRegex.exec(code)) !== null) {
            const startPos = traitMatch.index;

            // Find the end of this trait by counting braces
            let braceCount = 1;
            let endPos = startPos + traitMatch[0].length;

            while (braceCount > 0 && endPos < code.length) {
                if (code[endPos] === '{') braceCount++;
                if (code[endPos] === '}') braceCount--;
                endPos++;
            }

            traitStartPositions.push({ name, startPos, endPos });
        }
    }

    // First check if the position is inside a contract
    for (const contract of contractStartPositions) {
        if (position > contract.startPos && position < contract.endPos) {
            return contract.name;
        }
    }

    // Then check if the position is inside a trait
    for (const trait of traitStartPositions) {
        if (position > trait.startPos && position < trait.endPos) {
            // If this trait is used by only one contract, associate it with that contract
            const usingContracts = traitToContractMap.get(trait.name) || [];
            if (usingContracts.length === 1) {
                return usingContracts[0]; // Associate with the single contract using it
            }
            // Otherwise, we'll return the trait name and handle the multiple contracts later
            return trait.name;
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

    // Extract all contract and trait names
    const contractNames = extractContractNames(cleanedCode);
    const traitNames = extractTraitNames(cleanedCode);
    const traitToContractMap = mapTraitsToContracts(cleanedCode, contractNames, traitNames);

    const multipleContracts = contractNames.length > 1;

    // Find all function declarations
    const functions = new Map<string, {
        id: string,
        params: string,
        body: string,
        type: string,
        contractName: string,
        isTrait: boolean,
        traitName?: string
    }>();

    // Find function declarations for each type

    // 1. Init function
    const initPattern = /init\s*\(([^)]*)\)\s*{/g;
    let initMatch;
    while ((initMatch = initPattern.exec(cleanedCode)) !== null) {
        const params = initMatch[1] || '';
        const bodyStartPos = initMatch.index + initMatch[0].length;
        const contractName = findContractForPosition(cleanedCode, initMatch.index, contractNames, traitNames, traitToContractMap);

        // Determine if this function is from a trait
        const isTrait = traitNames.includes(contractName);
        const traitName = isTrait ? contractName : undefined;

        // If it's a trait function, use the contracts that implement it
        let effectiveContractName = contractName;
        if (isTrait) {
            const implementingContracts = traitToContractMap.get(contractName) || [];
            if (implementingContracts.length === 1) {
                effectiveContractName = implementingContracts[0];
            }
        }

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
        const functionId = multipleContracts ? `${effectiveContractName}::init` : 'init';

        // Add init function with a special name
        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'init',
            contractName: effectiveContractName,
            isTrait,
            traitName
        });
    }

    // 2. Receive functions
    const receivePattern = /receive\s*\(([^)]*)\)\s*{/g;
    let receiveMatch;
    while ((receiveMatch = receivePattern.exec(cleanedCode)) !== null) {
        // Extract the message type from the parameter
        const params = receiveMatch[1] || '';
        const contractName = findContractForPosition(cleanedCode, receiveMatch.index, contractNames, traitNames, traitToContractMap);

        // Determine if this function is from a trait
        const isTrait = traitNames.includes(contractName);
        const traitName = isTrait ? contractName : undefined;

        // If it's a trait function, use the contracts that implement it
        let effectiveContractName = contractName;
        if (isTrait) {
            const implementingContracts = traitToContractMap.get(contractName) || [];
            if (implementingContracts.length === 1) {
                effectiveContractName = implementingContracts[0];
            }
        }

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
        const functionId = multipleContracts ? `${effectiveContractName}::${funcBaseName}` : funcBaseName;

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
            contractName: effectiveContractName,
            isTrait,
            traitName
        });
    }

    // 3. Get functions
    const getPattern = /get\s+fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?\s*{/g;
    let getMatch;
    while ((getMatch = getPattern.exec(cleanedCode)) !== null) {
        const funcName = getMatch[1];
        const params = getMatch[2] || '';
        const contractName = findContractForPosition(cleanedCode, getMatch.index, contractNames, traitNames, traitToContractMap);

        // Determine if this function is from a trait
        const isTrait = traitNames.includes(contractName);
        const traitName = isTrait ? contractName : undefined;

        // If it's a trait function, use the contracts that implement it
        let effectiveContractName = contractName;
        if (isTrait) {
            const implementingContracts = traitToContractMap.get(contractName) || [];
            if (implementingContracts.length === 1) {
                effectiveContractName = implementingContracts[0];
            }
        }

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
        const functionId = multipleContracts ? `${effectiveContractName}::${getBaseId}` : getBaseId;

        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'get_fun',
            contractName: effectiveContractName,
            isTrait,
            traitName
        });
    }

    // 4. Regular functions
    const funPattern = /(?<!get\s+)fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?\s*{/g;
    let funMatch;
    while ((funMatch = funPattern.exec(cleanedCode)) !== null) {
        const funcName = funMatch[1];
        const params = funMatch[2] || '';
        const contractName = findContractForPosition(cleanedCode, funMatch.index, contractNames, traitNames, traitToContractMap);

        // Determine if this function is from a trait
        const isTrait = traitNames.includes(contractName);
        const traitName = isTrait ? contractName : undefined;

        // If it's a trait function, use the contracts that implement it
        let effectiveContractName = contractName;
        if (isTrait) {
            const implementingContracts = traitToContractMap.get(contractName) || [];
            if (implementingContracts.length === 1) {
                effectiveContractName = implementingContracts[0];
            }
        }

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
        const functionId = multipleContracts ? `${effectiveContractName}::${funcName}` : funcName;

        functions.set(functionId, {
            id: functionId,
            params,
            body,
            type: 'fun',
            contractName: effectiveContractName,
            isTrait,
            traitName
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
            functionType: func.type.replace(/\s+/g, '_') as any,
            // Add trait info to the node if needed
            isTrait: func.isTrait,
            traitName: func.traitName
        };
        graph.nodes.push(node);
    });

    // Second pass: analyze function calls without nested iterations
    const baseNameMap = new Map<string, string[]>();
    functions.forEach((func, name) => {
        let base = name.includes('::') ? name.split('::')[1] : name;
        if (base.startsWith('get_fun_')) {
            base = base.substring(8);
        }
        const arr = baseNameMap.get(base) || [];
        arr.push(name);
        baseNameMap.set(base, arr);
    });

    const functionNames = Array.from(baseNameMap.keys()).sort((a, b) => b.length - a.length);
    const callRegex = new RegExp(`\\b(${functionNames.join('|')})\\s*\\(`, 'g');

    functions.forEach((func, funcName) => {
        const funcBody = func.body;
        const addedEdges = new Set<string>();
        let match: RegExpExecArray | null;

        while ((match = callRegex.exec(funcBody)) !== null) {
            const m = match as RegExpExecArray;
            const baseCalledName = m[1];
            const targets = baseNameMap.get(baseCalledName) || [];
            targets.forEach(targetId => {
                if (targetId !== funcName) {
                    const lineStart = funcBody.lastIndexOf('\n', m.index) + 1;
                    const lineEnd = funcBody.indexOf('\n', m.index);
                    const line = funcBody.substring(lineStart, lineEnd === -1 ? funcBody.length : lineEnd);
                    const beforeMatch = line.substring(0, m.index - lineStart);
                    if (beforeMatch.includes('//') || beforeMatch.includes(';')) {
                        return;
                    }

                    const edgeKey = `${funcName}->${targetId}`;
                    if (!addedEdges.has(edgeKey)) {
                        graph.edges.push({
                            from: funcName,
                            to: targetId,
                            label: ''
                        });
                        addedEdges.add(edgeKey);
                    }
                }
            });
        }

        callRegex.lastIndex = 0;
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