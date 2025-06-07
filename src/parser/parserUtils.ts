import * as path from 'path';
import { ContractGraph } from '../types/graph';
import { parseContractCode } from '../languages/func/funcParser';
import { parseTactContract } from '../languages/func/tactParser';
import { parseTolkContract } from '../languages/func/tolkParser';
import { processImports, isPathInsideWorkspace } from '../languages/func/importHandler';
import { parseMoveContract } from './moveParser';
import { parseCairoContract } from '../languages/cairo';
import { parsePlutusContract } from '../languages/plutus';
import { parseCadenceContract } from '../languages/cadence';
import { parseMichelsonContract } from '../languages/michelson';
import { parseClarContract } from '../languages/clar';
import { parseInkContract } from '../languages/ink';
import { parseScillaContract } from '../languages/scilla';
import { parsePactContract } from '../languages/pact';
import { parseScryptoContract } from '../languages/scrypto';
import { parseSorobanContract } from '../languages/soroban';
import { parseLigoContract } from '../languages/ligo';
import { parseAikenContract } from '../languages/aiken';
import { parseLeoContract } from '../languages/leo';
import { parseTealContract } from '../languages/teal';
import { parseGlowContract } from '../languages/glow';
import { parseBambooContract } from '../languages/bamboo';
import { parseSophiaContract } from '../languages/sophia';
import { parseFlintContract } from '../languages/flint';
import { parseFeContract } from '../languages/fe';
import { parseLiquidityContract } from '../languages/liquidity';
import { parseReachContract } from '../languages/reach';
import { parseRellContract } from '../languages/rell';
import { parseRholangContract } from '../languages/rholang';
import { parseMarloweContract } from '../languages/marlowe';
import * as vscode from 'vscode';
import * as toml from 'toml';
import logger from '../logging/logger';

const parseCache = new Map<string, ContractGraph>();

if (vscode.workspace && typeof vscode.workspace.onDidChangeTextDocument === 'function') {
    vscode.workspace.onDidChangeTextDocument(e => {
        parseCache.delete(`${e.document.uri.toString()}-${detectLanguage(e.document.fileName)}`);
    });
}

export type ContractLanguage =
  | 'func'
  | 'tact'
  | 'tolk'
  | 'move'
  | 'cairo'
  | 'plutus'
  | 'cadence'
  | 'michelson'
  | 'clar'
  | 'ink'
  | 'scilla'
  | 'pact'
  | 'scrypto'
  | 'soroban'
  | 'ligo'
  | 'aiken'
  | 'leo'
  | 'teal'
  | 'glow'
  | 'bamboo'
  | 'sophia'
  | 'flint'
  | 'liquidity'
  | 'fe'
  | 'reach'
  | 'rell'
  | 'rholang'
  | 'marlowe';

/**
 * Detects the language based on file extension
 */
export function detectLanguage(filePath: string): ContractLanguage {
    const extension = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath).toLowerCase();

    if (extension === '.move' || base === 'move.toml') {
        return 'move';
    } else if (extension === '.tact') {
        return 'tact';
    } else if (extension === '.tolk') {
        return 'tolk';
    } else if (extension === '.cairo') {
        return 'cairo';
    } else if (extension === '.plutus') {
        return 'plutus';
    } else if (extension === '.cdc') {
        return 'cadence';
    } else if (extension === '.tz') {
        return 'michelson';
    } else if (extension === '.clar') {
        return 'clar';
    } else if (extension === '.ink') {
        return 'ink';
  } else if (extension === '.scilla') {
      return 'scilla';
  } else if (extension === '.pact') {
      return 'pact';
  } else if (extension === '.scrypto' || extension === '.rs') {
      return 'scrypto';
  } else if (extension === '.soroban') {
      return 'soroban';
  } else if (extension === '.teal') {
      return 'teal';
  } else if (extension === '.ligo' || extension === '.mligo' || extension === '.religo' || extension === '.jsligo') {
      return 'ligo';
  } else if (extension === '.ak' || extension === '.aiken') {
      return 'aiken';
  } else if (extension === '.leo') {
      return 'leo';
  } else if (extension === '.glow') {
      return 'glow';
  } else if (extension === '.bamboo') {
      return 'bamboo';
  } else if (extension === '.fe') {
      return 'fe';
  } else if (extension === '.flint') {
      return 'flint';
  } else if (extension === '.rell') {
      return 'rell';
  } else if (extension === '.reach') {
      return 'reach';
  } else if (extension === '.rho') {
      return 'rholang';
  } else if (extension === '.liq') {
      return 'liquidity';
  } else if (extension === '.aes') {
      return 'sophia';
  } else if (extension === '.marlowe') {
      return 'marlowe';
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
        case 'cairo':
            graph = parseCairoContract(code);
            break;
        case 'plutus':
            graph = parsePlutusContract(code);
            break;
        case 'cadence':
            graph = parseCadenceContract(code);
            break;
        case 'michelson':
            graph = parseMichelsonContract(code);
            break;
        case 'clar':
            graph = parseClarContract(code);
            break;
        case 'ink':
            graph = parseInkContract(code);
            break;
        case 'scrypto':
            graph = parseScryptoContract(code);
            break;
        case 'soroban':
            graph = parseSorobanContract(code);
            break;
        case 'scilla':
            graph = parseScillaContract(code);
            break;
        case 'teal':
            graph = parseTealContract(code);
            break;
        case 'pact':
            graph = parsePactContract(code);
            break;
        case 'ligo':
            graph = parseLigoContract(code);
            break;
        case 'aiken':
            graph = parseAikenContract(code);
            break;
        case 'leo':
            graph = parseLeoContract(code);
            break;
        case 'glow':
            graph = parseGlowContract(code);
            break;
        case 'fe':
            graph = parseFeContract(code);
            break;
        case 'flint':
            graph = parseFlintContract(code);
            break;
        case 'reach':
            graph = parseReachContract(code);
            break;
        case 'rell':
            graph = parseRellContract(code);
            break;
        case 'rholang':
            graph = parseRholangContract(code);
            break;
        case 'liquidity':
            graph = parseLiquidityContract(code);
            break;
        case 'sophia':
            graph = parseSophiaContract(code);
            break;
        case 'bamboo':
            graph = parseBambooContract(code);
            break;
        case 'marlowe':
            graph = parseMarloweContract(code);
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
        const fs = await import('fs');
        const moveFiles: string[] = [];

        function collect(dir: string) {
            if (!fs.existsSync(dir)) return;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    collect(full);
                } else if (entry.isFile() && full.endsWith('.move')) {
                    moveFiles.push(full);
                }
            }
        }

        function findRoot(start: string): string | null {
            let cur = start;
            while (true) {
                const p = path.join(cur, 'Move.toml');
                if (fs.existsSync(p)) return cur;
                const parent = path.dirname(cur);
                if (parent === cur) break;
                cur = parent;
            }
            return null;
        }

        const root = findRoot(path.dirname(filePath));
        if (root) {
            collect(root);
            const tomlPath = path.join(root, 'Move.toml');
            try {
                const text = fs.readFileSync(tomlPath, 'utf8');
                const parsed = toml.parse(text);
                const deps = parsed.dependencies || {};
                for (const key of Object.keys(deps)) {
                    const dep = deps[key];
                    if (dep && typeof dep === 'object' && dep.local) {
                        const depDir = path.resolve(root, dep.local);
                        if (isPathInsideWorkspace(depDir)) {
                            collect(depDir);
                        }
                    }
                }
            } catch (err) {
                logger.error(`Invalid Move.toml at ${tomlPath}`, err);
            }
        } else {
            moveFiles.push(filePath);
        }

        const combined = moveFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n\n');
        return parseMoveContract(combined);
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
                { value: 'regular', label: 'Regular' },
                { value: 'entry', label: 'Entry' },
                { value: 'script', label: 'Script' },
                { value: 'public', label: 'Public' },
                { value: 'friend', label: 'Friend' }
            ];
        case 'cairo':
        case 'plutus':
        case 'cadence':
        case 'michelson':
        case 'clar':
        case 'ink':
        case 'scrypto':
        case 'soroban':
        case 'scilla':
        case 'pact':
        case 'teal':
        case 'ligo':
        case 'aiken':
        case 'leo':
        case 'glow':
        case 'bamboo':
        case 'flint':
        case 'reach':
        case 'rell':
        case 'liquidity':
        case 'fe':
        case 'rholang':
        case 'sophia':
        case 'marlowe':
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