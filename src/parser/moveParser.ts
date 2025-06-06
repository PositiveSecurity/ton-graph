import Parser from 'tree-sitter';
import Move from 'tree-sitter-move';

export interface MoveImport {
  alias: string;
  path: string;
}

export interface MoveFunction {
  name: string;
  isPublic: boolean;
  body?: Parser.SyntaxNode;
}

export interface MoveModule {
  name: string;
  address?: string;
  uses: MoveImport[];
  functions: MoveFunction[];
}

export interface MoveAST {
  modules: MoveModule[];
}

let parser: Parser | null = null;
function getParser(): Parser {
  if (!parser) {
    parser = new Parser();
    parser.setLanguage(Move as any);
  }
  return parser;
}

function findNodes(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
  const result: Parser.SyntaxNode[] = [];
  const stack: Parser.SyntaxNode[] = [node];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === type) result.push(n);
    for (const child of n.namedChildren) stack.push(child);
  }
  return result;
}

export function parseMove(code: string): { ast: MoveAST; tree: Parser.Tree } {
  const p = getParser();
  const tree = p.parse(code);
  const modules: MoveModule[] = [];
  for (const moduleNode of findNodes(tree.rootNode, 'module_definition')) {
    const idNode = moduleNode.childForFieldName('module_identity');
    let moduleName = '';
    let address: string | undefined;
    if (idNode) {
      const addr = idNode.childForFieldName('address');
      const mod = idNode.childForFieldName('module');
      if (addr) address = addr.text;
      if (mod) moduleName = mod.text;
    }
    const body = moduleNode.childForFieldName('module_body');
    const uses: MoveImport[] = [];
    const functions: MoveFunction[] = [];
    if (body) {
      for (const child of body.namedChildren) {
        if (child.type === 'use_declaration') {
          let text = child.text.replace(/^public\s+/, '');
          text = text.replace(/^use\s+/, '').replace(/;$/, '').trim();
          const parts = text.split(/\s+as\s+/);
          const path = parts[0].trim();
          const alias = parts[1] ? parts[1].trim() : path.split('::').pop()!;
          uses.push({ alias, path });
        } else if (child.type === 'function_definition') {
          const nameNode = child.childForFieldName('name');
          if (!nameNode) continue;
          const sig = child.child(0);
          let isPublic = false;
          if (sig) {
            for (const sc of sig.namedChildren) {
              if (sc.type === 'modifier' && sc.text.startsWith('public')) {
                isPublic = true;
              }
            }
          }
          const bodyNode = child.childForFieldName('body');
          functions.push({ name: nameNode.text, isPublic, body: bodyNode || undefined });
        }
      }
    }
    modules.push({ name: moduleName, address, uses, functions });
  }
  return { ast: { modules }, tree };
}
