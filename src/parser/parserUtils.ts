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
import { parseHuffContract } from '../languages/huff';
import { parseBambooContract } from '../languages/bamboo';
import { parseSophiaContract } from '../languages/sophia';
import { parseFlintContract } from '../languages/flint';
import { parseFeContract } from '../languages/fe';
import { parseNoirContract, parseNoir } from './noirParser';
import { parseSimplicityContract } from '../languages/simplicity';
import { parseLiquidityContract } from '../languages/liquidity';
import { parseReachContract } from '../languages/reach';
import { parseRellContract } from '../languages/rell';
import { parseRholangContract } from '../languages/rholang';
import { parseMarloweContract } from '../languages/marlowe';
import { parseYulContract } from '../languages/yul';
import * as vscode from 'vscode';
import * as toml from 'toml';
import logger from '../logging/logger';

const parseCache = new Map<string, ContractGraph>();

if (vscode.workspace && typeof vscode.workspace.onDidChangeTextDocument === 'function') {
    vscode.workspace.onDidChangeTextDocument(e => {
        parseCache.delete(`${e.document.uri.toString()}-${detectLanguage(e.document.fileName)}`);
    });
}

function collectNoirImports(code: string): string[] {
    const { ast, tree } = parseNoir(code);
    const result: Set<string> = new Set();

    // Traverse the syntax tree for `mod foo;` declarations
    const stack = [tree.rootNode];
    while (stack.length) {
        const node = stack.pop();
        if (!node) continue;
        if (node.type === 'module') {
            const body = node.namedChildren.find(c => c.type === 'body');
            if (!body) {
                const id = node.namedChildren.find(c => c.type === 'identifier');
                if (id) result.add(id.text);
            }
        }
        stack.push(...node.namedChildren);
    }

    // Also detect nested module declarations like `mod a::b;`
    const modMatches = code.matchAll(/(?:^|\s)(?:pub\s+)?mod\s+([A-Za-z_][\w:]*)\s*;/gm);
    for (const m of modMatches) {
        result.add(m[1]);
    }

    // Collect paths from `use` statements
    for (const u of ast.uses) {
        if (u.path.endsWith('::*')) {
            result.add(u.path.slice(0, -3));
        } else {
            const parts = u.path.split('::');
            parts.pop();
            if (parts.length) result.add(parts.join('::'));
        }
    }

    return Array.from(result);
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
  | 'huff'
  | 'bamboo'
  | 'sophia'
  | 'flint'
  | 'liquidity'
  | 'fe'
  | 'noir'
  | 'simplicity'
  | 'reach'
  | 'rell'
  | 'rholang'
  | 'marlowe'
  | 'yul';

/**
 * Detects the language based on file extension
 */
const extensionLanguageMap = new Map<string, ContractLanguage>([
    ['.move', 'move'],
    ['.tact', 'tact'],
    ['.tolk', 'tolk'],
    ['.cairo', 'cairo'],
    ['.plutus', 'plutus'],
    ['.cdc', 'cadence'],
    ['.tz', 'michelson'],
    ['.clar', 'clar'],
    ['.ink', 'ink'],
    ['.scilla', 'scilla'],
    ['.pact', 'pact'],
    ['.scrypto', 'scrypto'],
    ['.rs', 'scrypto'],
    ['.soroban', 'soroban'],
    ['.teal', 'teal'],
    ['.ligo', 'ligo'],
    ['.mligo', 'ligo'],
    ['.religo', 'ligo'],
    ['.jsligo', 'ligo'],
    ['.ak', 'aiken'],
    ['.aiken', 'aiken'],
    ['.leo', 'leo'],
    ['.glow', 'glow'],
    ['.huff', 'huff'],
    ['.bamboo', 'bamboo'],
    ['.fe', 'fe'],
    ['.nr', 'noir'],
    ['.noir', 'noir'],
    ['.simp', 'simplicity'],
    ['.flint', 'flint'],
    ['.rell', 'rell'],
    ['.reach', 'reach'],
    ['.rho', 'rholang'],
    ['.liq', 'liquidity'],
    ['.aes', 'sophia'],
    ['.marlowe', 'marlowe'],
    ['.yul', 'yul']
]);

export function detectLanguage(filePath: string): ContractLanguage {
    const extension = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath).toLowerCase();
    if (base === 'move.toml') {
        return 'move';
    }
    return extensionLanguageMap.get(extension) || 'func';
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
        case 'huff':
            graph = parseHuffContract(code);
            break;
        case 'fe':
            graph = parseFeContract(code);
            break;
        case 'noir':
            graph = parseNoirContract(code);
            break;
        case 'simplicity':
            graph = parseSimplicityContract(code);
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
        case 'yul':
            graph = parseYulContract(code);
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
    if (language === 'noir') {
        const fs = await import('fs');
        const fsp = fs.promises;
        const visited = new Set<string>();

        async function exists(p: string): Promise<boolean> {
            try {
                await fsp.access(p);
                return true;
            } catch {
                return false;
            }
        }

        async function findRoot(start: string): Promise<string | null> {
            let cur = start;
            while (true) {
                const p = path.join(cur, 'Nargo.toml');
                if (await exists(p)) return cur;
                const parent = path.dirname(cur);
                if (parent === cur) break;
                cur = parent;
            }
            return null;
        }

        const root = await findRoot(path.dirname(filePath));
        const baseDirs: string[] = [];
        if (root) {
            baseDirs.push(path.join(root, 'src'));
            const tomlPath = path.join(root, 'Nargo.toml');
            try {
                const text = await fsp.readFile(tomlPath, 'utf8');
                const parsed = toml.parse(text);
                const deps = parsed.dependencies || {};
                for (const key of Object.keys(deps)) {
                    const dep = deps[key];
                    if (dep && typeof dep === 'object' && (dep.path || dep.local)) {
                        const rel = dep.path || dep.local;
                        const depDir = path.resolve(root, rel);
                        if (isPathInsideWorkspace(depDir)) {
                            baseDirs.push(path.join(depDir, 'src'));
                        }
                    }
                }
            } catch (err) {
                logger.error(`Invalid Nargo.toml at ${tomlPath}`, err);
            }
        }

        async function load(file: string): Promise<string> {
            const resolved = path.resolve(file);
            if (visited.has(resolved)) return '';
            if (!(await exists(resolved))) return '';
            visited.add(resolved);
            let text = '';
            try {
                text = await fsp.readFile(resolved, 'utf8');
            } catch {
                return '';
            }
            const dir = path.dirname(resolved);
            let out = '';
            for (const imp of collectNoirImports(text)) {
                let parts = imp.split('::');
                let searchDirs = [dir, ...baseDirs];
                if (parts[0] === 'crate') {
                    parts = parts.slice(1);
                    if (root) {
                        searchDirs = [path.join(root, 'src'), ...searchDirs];
                    }
                }
                for (const base of searchDirs) {
                    const cand1 = path.join(base, ...parts) + '.nr';
                    const cand2 = path.join(base, ...parts, 'mod.nr');
                    if (await exists(cand1) && isPathInsideWorkspace(cand1)) {
                        out += await load(cand1);
                        break;
                    } else if (await exists(cand2) && isPathInsideWorkspace(cand2)) {
                        out += await load(cand2);
                        break;
                    }
                }
            }
            out += `\n\n${text}`;
            return out;
        }

        const combined = await load(filePath);
        return parseNoirContract(combined);
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
        case 'huff':
        case 'bamboo':
        case 'flint':
        case 'reach':
        case 'rell':
        case 'liquidity':
        case 'fe':
        case 'noir':
        case 'simplicity':
        case 'rholang':
        case 'sophia':
        case 'marlowe':
        case 'yul':
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