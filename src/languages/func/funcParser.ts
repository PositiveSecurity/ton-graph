import * as path from 'path';
import * as vscode from 'vscode';
import * as WebTreeSitter from 'web-tree-sitter';
import { loadFunC } from '@scaleton/tree-sitter-func';
import { ContractGraph, ContractNode } from '../../types/graph';
import { GraphNodeKind } from '../../types/graphNodeKind';

const BUILT_IN_FUNCTIONS = new Set([
    'if', 'elseif', 'while', 'for', 'switch', 'return', 'throw', 'throw_unless',
    'slice_empty', 'begin_parse', 'load_uint', 'load_msg_addr', 'load_ref',
    'end_parse', 'get_data', 'get_balance', 'send_raw_message', 'begin_cell',
    'store_uint', 'store_slice', 'store_coins', 'store_ref', 'end_cell',
    'equal_slices_bits', 'null', 'now', 'my_address', 'cur_lt', 'block_lt',
    'cell_hash', 'slice_hash', 'string_hash', 'mod', 'min', 'max', 'parse_var_addr',
    'divmod', 'commit', 'set_code', 'set_data', 'set_gas_limit', 'store_builder',
    'store_uint', 'load_int', 'store_int', 'load_bits', 'store_bits', 'cell',
    'throw_if', 'udict_set_builder', 'udict_set', 'udict_get?', 'udict_get_next?',
    'udict_delete?', 'dict_set', 'dict_get?', 'dict_get_next?', 'dict_delete?',
    'skip_bits', 'preload_bits', 'preload_uint', 'preload_int', 'preload_ref',
    'preload_slice', 'load_dict', 'store_dict', 'skip_dict', 'load_maybe_ref',
    'skip_maybe_ref', 'preload_maybe_ref', 'raw_reserve', 'config_param', 'touch',
    'rand', 'get_config', 'slice_refs', 'check_signature', 'cons', 'nil',
    'slice_bits', 'slice_bits_refs', 'equal_slices', 'begin_string', 'end_string',
    'string_builder', 'append_string_builder', 'slice_begin', 'slice_end',
    'slice_last', 'slice_first', 'load_coins', 'store_coins', 'tuple', 'untuple',
    'tuple_length', 'tuple_index', 'tuple_set_index', 'tuple_set_index_var',
    'tuple_map', 'is_null', 'is_null?', 'is_tuple', 'is_slice', 'is_cell',
    'is_builder', 'asm', 'global', 'const', 'var', 'int', 'cell', 'slice',
    'builder', 'forall', 'extern'
]);

let parserInstance: WebTreeSitter.Parser | null = null;
async function getParser(): Promise<WebTreeSitter.Parser> {
    if (!parserInstance) {
        await WebTreeSitter.Parser.init();
        parserInstance = new WebTreeSitter.Parser();
        parserInstance.setLanguage(await loadFunC());
    }
    return parserInstance;
}

export async function parseContractCode(code: string): Promise<ContractGraph> {
    const parser = await getParser();
    const tree = parser.parse(code);
    const graph: ContractGraph = { nodes: [], edges: [] };
    if (!tree) {
        return graph;
    }
    const contractName = vscode.window.activeTextEditor
        ? path.basename(vscode.window.activeTextEditor.document.fileName).split('.')[0]
        : 'Contract';

    const functions = tree.rootNode.descendantsOfType('function_definition');
    const bodies = new Map<string, WebTreeSitter.Node>();

    for (const fn of functions) {
        if (!fn) continue;
        const nameNode = fn.descendantsOfType('function_name')[0];
        if (!nameNode) continue;
        const funcName = nameNode.text;
        if (BUILT_IN_FUNCTIONS.has(funcName)) continue;

        const paramNode = fn.descendantsOfType('parameter_list')[0];
        const params = paramNode ? paramNode.text.slice(1, -1) : '';
        const bodyNode = fn.descendantsOfType('block_statement')[0];
        if (bodyNode) bodies.set(funcName, bodyNode);

        const node: ContractNode = {
            id: funcName,
            label: `${funcName}(${params})`,
            type: GraphNodeKind.Function,
            contractName,
            parameters: params.split(',').map((p: string) => p.trim()).filter(Boolean),
            functionType: 'regular'
        };
        graph.nodes.push(node);
    }

    for (const fn of functions) {
        if (!fn) continue;
        const nameNode = fn.descendantsOfType('function_name')[0];
        if (!nameNode) continue;
        const from = nameNode.text;
        const bodyNode = fn.descendantsOfType('block_statement')[0];
        if (!bodyNode) continue;
        const calls = bodyNode.descendantsOfType('function_application');
        const added = new Set<string>();
        for (const call of calls) {
            if (!call) continue;
            const idNode = call.child(0);
            if (!idNode) continue;
            const to = idNode.text;
            if (bodies.has(to) && to !== from && !added.has(to)) {
                graph.edges.push({ from, to, label: '' });
                added.add(to);
            }
        }
    }

    return graph;
}
