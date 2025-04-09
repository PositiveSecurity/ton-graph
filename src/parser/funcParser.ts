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

    // Second pass: analyze function calls
    functions.forEach((func, funcName) => {
        const funcBody = func.body;

        // Create a set to track already added edges to avoid duplicates
        const addedEdges = new Set<string>();

        // Check for calls to other functions
        functions.forEach((calledFunc, calledFuncName) => {
            if (funcName !== calledFuncName) {
                const bodyToSearch = funcBody;

                // Look for variable declarations with function calls - high priority
                // This covers the tuple assignment pattern `var (a, b) = functionName()` and regular assignments
                if (bodyToSearch.includes(calledFuncName)) {
                    // First, check most common tuple pattern
                    const tuplePatterns = [
                        // With 'var' keyword - tuple assignment
                        new RegExp(`var\\s*\\([^)]*\\)\\s*=\\s*${calledFuncName}\\s*\\(`, 'g'),
                        // Without 'var' keyword - direct tuple assignment
                        new RegExp(`\\([^)]*\\)\\s*=\\s*${calledFuncName}\\s*\\(`, 'g'),
                        // Check for direct variable assignments
                        new RegExp(`var\\s+[a-zA-Z_]\\w*\\s*=\\s*${calledFuncName}\\s*\\(`, 'g'),
                        // Simple assignment without var
                        new RegExp(`[a-zA-Z_]\\w*\\s*=\\s*${calledFuncName}\\s*\\(`, 'g')
                    ];

                    for (const pattern of tuplePatterns) {
                        const matches = bodyToSearch.match(pattern);
                        if (matches) {
                            graph.edges.push({
                                from: func.id,
                                to: calledFunc.id,
                                label: ''
                            });
                            addedEdges.add(`${func.id}->${calledFunc.id}`);
                            break;
                        }
                    }
                }

                // If not already added with tuple pattern, try our other patterns
                if (!addedEdges.has(`${func.id}->${calledFunc.id}`)) {
                    // Try multiple patterns to catch all possible function call syntaxes
                    const patterns = [
                        // Basic function call pattern with word boundary check
                        new RegExp(`(?:^|[^a-zA-Z0-9_])${calledFuncName}\\s*\\(`, 'g'),

                        // Simple assignment pattern
                        new RegExp(`=\\s*${calledFuncName}\\s*\\(`, 'g'),

                        // Function call in a return statement
                        new RegExp(`return\\s+${calledFuncName}\\s*\\(`, 'g'),

                        // Function call as a parameter to another function
                        new RegExp(`\\([^)]*${calledFuncName}\\s*\\(`, 'g'),

                        // Function call in an if statement or other control structures
                        new RegExp(`(?:if|while|do|elseif|return)\\s*\\(?[^)]*${calledFuncName}\\s*\\(`, 'g'),

                        // Function call in an expression with operators
                        new RegExp(`[+\\-*/%<>=!&|^]\\s*${calledFuncName}\\s*\\(`, 'g'),

                        // Function call after a comma (in parameter lists)
                        new RegExp(`,\\s*${calledFuncName}\\s*\\(`, 'g'),

                        // Function call used in conditional expressions
                        new RegExp(`\\?\\s*${calledFuncName}\\s*\\(`, 'g'),

                        // Function call nested in complex expressions
                        new RegExp(`\\(${calledFuncName}\\s*\\(`, 'g')
                    ];

                    // Process each pattern
                    for (const pattern of patterns) {
                        let match;
                        // Reset the regex lastIndex to ensure we start from the beginning
                        pattern.lastIndex = 0;

                        while ((match = pattern.exec(bodyToSearch)) !== null) {
                            const matchPos = match.index;

                            // Find the line containing this match to check for comments
                            const lineStart = bodyToSearch.lastIndexOf('\n', matchPos) + 1;
                            const lineEnd = bodyToSearch.indexOf('\n', matchPos);
                            const line = bodyToSearch.substring(
                                lineStart,
                                lineEnd === -1 ? bodyToSearch.length : lineEnd
                            );

                            // Check for comments on this line (before the match)
                            const lineBeforeMatch = line.substring(0, matchPos - lineStart);
                            if (lineBeforeMatch.includes('//') || lineBeforeMatch.includes(';')) {
                                continue; // Skip if in a comment
                            }

                            // Create a unique key for this edge to avoid duplicates
                            const edgeKey = `${func.id}->${calledFunc.id}`;

                            // Add edge if not already added
                            if (!addedEdges.has(edgeKey)) {
                                graph.edges.push({
                                    from: func.id,
                                    to: calledFunc.id,
                                    label: ''
                                });

                                addedEdges.add(edgeKey);
                                break; // Once we've found and added an edge with this pattern, move to the next pattern
                            }
                        }

                        if (addedEdges.has(`${func.id}->${calledFunc.id}`)) {
                            break; // If we added an edge, no need to check more patterns
                        }
                    }
                }

                // Additional check for direct function calls without various prefix patterns
                // This is a common case in FunC and might be missed by the regex patterns
                if (!addedEdges.has(`${func.id}->${calledFunc.id}`)) {
                    // Check the entire body for any direct function call pattern
                    let pos = 0;
                    const searchPattern = `${calledFuncName}(`;

                    while ((pos = bodyToSearch.indexOf(searchPattern, pos)) !== -1) {
                        // Ensure we have a proper word boundary (not a part of another identifier)
                        if (pos === 0 || !/[a-zA-Z0-9_]/.test(bodyToSearch.charAt(pos - 1))) {
                            // Find the line to check if it's in a comment
                            const lineStart = bodyToSearch.lastIndexOf('\n', pos) + 1;
                            const lineEnd = bodyToSearch.indexOf('\n', pos);
                            const line = bodyToSearch.substring(
                                lineStart,
                                lineEnd === -1 ? bodyToSearch.length : lineEnd
                            );

                            // Check for comments
                            const beforeMatch = line.substring(0, pos - lineStart);
                            if (!beforeMatch.includes('//') && !beforeMatch.includes(';')) {
                                graph.edges.push({
                                    from: func.id,
                                    to: calledFunc.id,
                                    label: ''
                                });
                                addedEdges.add(`${func.id}->${calledFunc.id}`);
                                break;
                            }
                        }
                        pos += searchPattern.length;
                    }
                }

                // Final deep scan for function calls that might be missed by previous patterns
                // This performs a thorough character-by-character analysis
                if (!addedEdges.has(`${func.id}->${calledFunc.id}`)) {
                    const functionCallRegex = new RegExp(`\\b${calledFuncName}\\s*\\(`, 'g');
                    let match;

                    while ((match = functionCallRegex.exec(bodyToSearch)) !== null) {
                        // Check if the match is not inside a comment or string
                        let isValid = true;
                        const lineStart = bodyToSearch.lastIndexOf('\n', match.index) + 1;
                        const lineEnd = bodyToSearch.indexOf('\n', match.index);
                        const currentLine = bodyToSearch.substring(
                            lineStart,
                            lineEnd === -1 ? bodyToSearch.length : lineEnd
                        );

                        // Check if in a comment
                        const commentPos1 = currentLine.indexOf('//');
                        const commentPos2 = currentLine.indexOf(';');
                        const matchRelativePos = match.index - lineStart;

                        if ((commentPos1 !== -1 && matchRelativePos > commentPos1) ||
                            (commentPos2 !== -1 && matchRelativePos > commentPos2)) {
                            isValid = false;
                        }

                        if (isValid) {
                            graph.edges.push({
                                from: func.id,
                                to: calledFunc.id,
                                label: ''
                            });
                            addedEdges.add(`${func.id}->${calledFunc.id}`);
                            break;
                        }
                    }
                }
            }
        });
    });

    return graph;
} 
