import * as path from 'path';
import { ContractGraph } from '../types/graph';
import { parseContractCode } from '../languages/func/funcParser';
import { parseTactContract } from '../languages/func/tactParser';
import { parseTolkContract } from '../languages/func/tolkParser';
import { processImports } from '../languages/func/importHandler';
import { parseMoveContract } from '../languages/move/moveParser';
import * as vscode from 'vscode';

const parseCache = new Map<string, ContractGraph>();

if (vscode.workspace && typeof vscode.workspace.onDidChangeTextDocument === 'function') {
    vscode.workspace.onDidChangeTextDocument(e => {
        parseCache.delete(`${e.document.uri.toString()}-${detectLanguage(e.document.fileName)}`);
    });
}

export type ContractLanguage = 'func' | 'tact' | 'tolk' | 'move';

/**
 * Detects the language based on file extension
 */
export function detectLanguage(filePath: string): ContractLanguage {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.move') {
        return 'move';
    } else if (extension === '.tact') {
        return 'tact';
    } else if (extension === '.tolk') {
        return 'tolk';
    }

    // Default to FunC
    return 'func';
}

/**
 * Parses contract code using the appropriate parser based on the detected language
 */
export async function parseContractByLanguage(code: string, language: ContractLanguage, uri?: vscode.Uri): Promise<ContractGraph> {
    const key = uri ? `${uri.toString()}-${language}` : undefined;
    if (key && parseCache.has(key)) {
        return parseCache.get(key)!;
    }
    let graph: ContractGraph;
    switch (language) {
        case 'move':
            graph = await parseMoveContract(code);
            break;
        case 'tact':
            graph = await parseTactContract(code);
            break;
        case 'tolk':
            graph = await parseTolkContract(code);
            break;
        case 'func':
        default:
            graph = await parseContractCode(code);
            break;
    }
    if (key) {
        parseCache.set(key, graph);
    }
    return graph;
}

/**
 * Parses a contract including its imports
 */
export async function parseContractWithImports(
    code: string,
    filePath: string,
    language: ContractLanguage
): Promise<ContractGraph> {
    if (language === 'move') {
        return parseMoveContract(code);
    }
    // Process imports first
    const { importedCode } = await processImports(code, filePath, language);

    // Combine the original code with imported code
    const combinedCode = `${importedCode}\n\n${code}`;

    // Parse the combined code
    return parseContractByLanguage(combinedCode, language);
}

/**
 * Returns the appropriate function type filters for the given language
 */
export function getFunctionTypeFilters(language: ContractLanguage): { value: string, label: string }[] {
    switch (language) {
        case 'tact':
            return [
                { value: 'init', label: 'Init' },
                { value: 'receive', label: 'Receive' },
                { value: 'fun', label: 'Fun' },
                { value: 'get_fun', label: 'Get Fun' }
            ];
        case 'tolk':
            return [
                { value: 'fun', label: 'Fun' },
                { value: 'pure_fun', label: 'Pure Fun' },
                { value: 'inline_fun', label: 'Inline Fun' },
                { value: 'get', label: 'Get' }
            ];
        case 'move':
            return [
                { value: 'regular', label: 'Regular' }
            ];
        case 'func':
        default:
            return [
                { value: 'impure', label: 'Impure' },
                { value: 'inline', label: 'Inline' },
                { value: 'method_id', label: 'Method ID' },
                { value: 'regular', label: 'Regular' }
            ];
    }
} 