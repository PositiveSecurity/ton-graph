import * as path from 'path';
import { ContractGraph } from '../types/graph';
import { parseContractCode } from './funcParser';
import { parseTactContract } from './tactParser';
import { parseTolkContract } from './tolkParser';

export type ContractLanguage = 'func' | 'tact' | 'tolk';

/**
 * Detects the language based on file extension
 */
export function detectLanguage(filePath: string): ContractLanguage {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.tact') {
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
export async function parseContractByLanguage(code: string, language: ContractLanguage): Promise<ContractGraph> {
    switch (language) {
        case 'tact':
            return await parseTactContract(code);
        case 'tolk':
            return await parseTolkContract(code);
        case 'func':
        default:
            return await parseContractCode(code);
    }
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