import * as path from 'path';
import * as vscode from 'vscode';
import { ContractGraph, GraphNode } from '../types/graph';

// List of built-in functions to exclude
const BUILT_IN_FUNCTIONS = new Set([
    // Control flow
    'if', 'elseif', 'while', 'for', 'switch', 'return', 'throw', 'throw_unless',
    // Standard library functions
    'slice_empty', 'begin_parse', 'load_uint', 'load_msg_addr', 'load_ref',
    'end_parse', 'get_data', 'get_balance', 'send_raw_message', 'begin_cell',
    'store_uint', 'store_slice', 'store_coins', 'store_ref', 'end_cell',
    'equal_slices_bits', 'null', 'now', 'my_address', 'cur_lt', 'block_lt',
    'cell_hash', 'slice_hash', 'string_hash',
    // Additional stdlib functions
    'mod', 'min', 'max', 'now', 'cur_lt', 'parse_var_addr', 'divmod', 'commit',
    'set_code', 'set_data', 'set_gas_limit', 'store_builder', 'store_uint', 'load_int',
    'store_int', 'load_bits', 'store_bits', 'get_data', 'cell', 'store_ref', 'load_ref',
    'throw_if', 'throw_unless',
    // Dictionary functions
    'udict_set_builder', 'udict_set', 'udict_get?', 'udict_get_next?', 'udict_delete?',
    'dict_set', 'dict_get?', 'dict_get_next?', 'dict_delete?',
    // Additional built-ins
    'skip_bits', 'preload_bits', 'preload_uint', 'preload_int', 'preload_ref', 'preload_slice',
    'load_dict', 'store_dict', 'skip_dict', 'load_maybe_ref', 'skip_maybe_ref', 'preload_maybe_ref',
    'end_cell', 'raw_reserve', 'end_parse', 'config_param', 'touch', 'rand', 'get_config',
    'slice_refs', 'check_signature', 'cons', 'nil', 'slice_bits', 'slice_bits_refs', 'equal_slices',
    'begin_string', 'end_string', 'touch', 'string_hash', 'string_builder', 'append_string_builder',
    'slice_begin', 'slice_end', 'slice_last', 'slice_first', 'load_coins', 'store_coins', 'tuple',
    'untuple', 'tuple_length', 'tuple_index', 'tuple_set_index', 'tuple_set_index_var', 'tuple_map',
    'is_null', 'is_null?', 'is_tuple', 'is_slice', 'is_cell', 'is_builder',
    // FunC keywords that might be mistaken for functions
    'asm', 'global', 'const', 'var', 'int', 'cell', 'slice', 'builder', 'forall', 'extern'
]);

// Function to remove comments from code: only removing lines starting with comments
function removeCommentsFromCode(code: string): string {
    // Remove full-line comments starting with ';;' or '//'
    let result = code.replace(/^\s*(;;|\/\/).*$/gm, '');
    // Remove multi-line comments if any
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
}

// Function to identify global variables in the contract
function identifyGlobalVariables(code: string): Set<string> {
    const globalVars = new Set<string>();

    // Regular expression to match global variable declarations
    // This pattern looks for "global" keyword followed by type and variable name
    const globalRegex = /global\s+(?:[a-zA-Z_][a-zA-Z0-9_:]*\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/g;

    let match;
    while ((match = globalRegex.exec(code)) !== null) {
        // Add the variable name to our set
        globalVars.add(match[1]);
    }

    // Also look for variable declarations at the top level with assignment
    // This pattern matches variable declarations like: var_name = value;
    const topLevelVarRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm;

    while ((match = topLevelVarRegex.exec(code)) !== null) {
        if (!globalVars.has(match[1])) {
            // Check if this is outside a function declaration by examining the context
            // This is a simplified approach - in a real implementation we'd need to check if this is 
            // within function braces or not
            const lineStart = code.lastIndexOf('\n', match.index) + 1;
            const context = code.substring(lineStart, match.index).trim();

            // If the context doesn't suggest this is inside a function, add it
            if (!context) {
                globalVars.add(match[1]);
            }
        }
    }

    return globalVars;
}

export async function parseContractCode(code: string): Promise<ContractGraph> {
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
    // This helps with handling multi-line function declarations
    const normalizedCode = code.replace(/\r\n/g, '\n');
    const cleanedCode = removeCommentsFromCode(normalizedCode);

    // Identify global variables
    const globalVariables = identifyGlobalVariables(cleanedCode);

    // Find all function declarations (including multi-line ones)
    const functions = new Map<string, { id: string, params: string, body: string, type: string }>();

    // Regex to find function declarations with return type and name
    // This first part finds the function name and opening parenthesis
    // Updated to match proper function declarations and avoid matching function calls
    const functionStartRegex = /(?:^|\s)(?:(?:\([^)]*\)|[a-zA-Z_][a-zA-Z0-9_:]*)\s+)?([a-zA-Z_]\w*)\s*\(/gm;

    // Try to exclude function calls by tracking context
    // This will help avoid confusing function calls with function declarations
    const excludedStartPositions = new Set<number>();

    // Pre-scan to exclude positions that are clearly function calls rather than declarations
    const functionCallPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
    let callMatch;
    while ((callMatch = functionCallPattern.exec(cleanedCode)) !== null) {
        // Look at what comes before this potential function name 
        // If it's inside a statement (after a semicolon or inside braces), it's likely a call
        const beforeCode = cleanedCode.substring(0, callMatch.index);
        const lastBrace = beforeCode.lastIndexOf('{');
        const lastSemicolon = beforeCode.lastIndexOf(';');
        const lastNewline = beforeCode.lastIndexOf('\n');

        // If the most recent "break" is a semicolon or brace, this is likely a function call inside a function body
        if ((lastBrace > lastNewline && lastBrace > 0) ||
            (lastSemicolon > lastNewline && lastSemicolon > 0)) {
            // This is inside a function body or statement, mark as excluded unless it's at the start of a line
            const lineStart = beforeCode.lastIndexOf('\n');
            const lineText = beforeCode.substring(lineStart + 1).trim();

            // If it's not at the start of a line (possibly with a return type), exclude it
            if (lineText.length > 0 && !lineText.match(/^\s*\([^)]*\)\s*$/)) {
                excludedStartPositions.add(callMatch.index);
            }
        }
    }

    let startMatch;
    while ((startMatch = functionStartRegex.exec(cleanedCode)) !== null) {
        // Skip if this position was marked as a function call
        if (excludedStartPositions.has(startMatch.index)) {
            continue;
        }

        const funcName = startMatch[1];

        // Skip built-in functions and identified global variables
        if (BUILT_IN_FUNCTIONS.has(funcName) || globalVariables.has(funcName)) {
            continue;
        }

        // Find the closing parenthesis for parameters
        let paramStartPos = startMatch.index + startMatch[0].length;
        let braceCount = 1; // Already opened one parenthesis
        let paramEndPos = paramStartPos;

        while (braceCount > 0 && paramEndPos < cleanedCode.length) {
            if (cleanedCode[paramEndPos] === '(') braceCount++;
            if (cleanedCode[paramEndPos] === ')') braceCount--;
            paramEndPos++;
        }

        if (braceCount > 0) {
            continue; // Skip this function if we can't find the closing parenthesis
        }

        const params = cleanedCode.slice(paramStartPos, paramEndPos - 1).trim();

        // Check for ASM implementation - look for patterns like "impure asm" or just "asm" after parameters
        const afterParams = cleanedCode.slice(paramEndPos).trim();
        const asmMatch = afterParams.match(/^(impure\s+asm|asm)(\([^)]*\))?\s+"[^"]+";/);

        if (asmMatch) {
            // This is an ASM implementation without braces
            const asmBody = asmMatch[0];
            functions.set(funcName, {
                id: funcName,
                params,
                body: asmBody,
                type: afterParams.includes('impure') ? 'impure' : 'regular'
            });

            continue; // Skip the rest of the processing for this function
        }

        // Now look for the opening brace after the closing parenthesis
        // Skip any modifiers that might be present between ) and {
        let openBracePos = cleanedCode.indexOf('{', paramEndPos);
        let semicolonPos = cleanedCode.indexOf(';', paramEndPos);

        // Check if this is just a function prototype (ends with semicolon before any brace)
        if (semicolonPos !== -1 && (openBracePos === -1 || semicolonPos < openBracePos)) {
            continue;
        }

        // Check if there are modifiers between ) and {
        const afterParamSection = cleanedCode.slice(paramEndPos, openBracePos).trim();
        let funcType = 'regular';

        const modifierMatch = afterParamSection.match(/\b(impure|inline|method_id)\b/);
        if (modifierMatch) {
            funcType = modifierMatch[1];
        }

        if (openBracePos === -1) {
            continue; // Skip this function if we can't find the opening brace
        }

        // Find the matching closing brace for the function body
        let bodyStartPos = openBracePos + 1;
        braceCount = 1; // Already opened one brace
        let bodyEndPos = bodyStartPos;

        while (braceCount > 0 && bodyEndPos < cleanedCode.length) {
            if (cleanedCode[bodyEndPos] === '{') braceCount++;
            if (cleanedCode[bodyEndPos] === '}') braceCount--;
            bodyEndPos++;
        }

        if (braceCount > 0) {
            continue; // Skip this function if we can't find the closing brace
        }

        const body = cleanedCode.slice(bodyStartPos, bodyEndPos - 1);

        // Skip functions without implementation (empty bodies)
        if (!body.trim()) {
            continue;
        }

        functions.set(funcName, {
            id: funcName,
            params,
            body,
            type: funcType
        });
    }

    // Create nodes for each function
    functions.forEach((func, name) => {
        const node: GraphNode = {
            id: name,
            label: `${name}(${func.params})`,
            type: 'function',
            contractName,
            parameters: func.params.split(',').map(p => p.trim()).filter(p => p),
            functionType: func.type as 'impure' | 'inline' | 'method_id' | 'regular'
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
