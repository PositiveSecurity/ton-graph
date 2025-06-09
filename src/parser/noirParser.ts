import Parser from "tree-sitter";
import Noir from "tree-sitter-noir";
import { ContractGraph, ContractNode } from "../types/graph";
import { GraphNodeKind } from "../types/graphNodeKind";
import { walk } from "./sharedWalk";

export interface NoirFunction {
  name: string;
  moduleName?: string;
  body?: Parser.SyntaxNode;
  startPosition: Parser.Point;
  endPosition: Parser.Point;
  params: string[];
  isPublic?: boolean;
}

export interface NoirModule {
  name: string;
  body?: Parser.SyntaxNode;
  filePath?: string;
}

export interface NoirUse {
  alias: string;
  path: string;
}

export interface NoirAST {
  functions: NoirFunction[];
  modules: NoirModule[];
  uses: NoirUse[];
}

let parser: Parser | null = null;
function getParser(): Parser {
  if (!parser) {
    parser = new Parser();
    parser.setLanguage(Noir as any);
  }
  return parser;
}

export function parseNoir(code: string): { ast: NoirAST; tree: Parser.Tree } {
  const p = getParser();
  let tree: Parser.Tree;
  try {
    tree = p.parse(code);
  } catch {
    tree = p.parse("");
  }
  const functions: NoirFunction[] = [];
  const modules: NoirModule[] = [];
  const uses: NoirUse[] = [];
  const fnNodes = walk(tree.rootNode, "function_definition");
  for (const fn of fnNodes) {
    const idNode = fn.namedChildren.find((c: Parser.SyntaxNode) => c.type === "identifier");
    const bodyNode = fn.namedChildren.find((c: Parser.SyntaxNode) => c.type === "body");
    const paramNode = fn.namedChildren.find((c: Parser.SyntaxNode) => c.type === "parameter");
    if (idNode) {
      const modulePath: string[] = [];
      let structName: string | null = null;
      let parent: Parser.SyntaxNode | null = fn.parent;
      while (parent) {
        if (parent.type === "struct_method" && !structName) {
          const structId = parent.namedChildren.find((c: Parser.SyntaxNode) => c.type === "identifier");
          if (structId) {
            structName = structId.text;
          }
        } else if (parent.type === "module") {
          const modId = parent.namedChildren.find((c: Parser.SyntaxNode) => c.type === "identifier");
          if (modId) {
            modulePath.unshift(modId.text);
          }
        }
        parent = parent.parent;
      }
      const parts = [...modulePath];
      if (structName) parts.push(structName);
      const prefix = parts.length ? parts.join("::") + "::" : "";
      const params: string[] = [];
      if (paramNode) {
        for (const p of paramNode.namedChildren) {
          if (p.type === "typed_identifier") {
            const varNode = p.childForFieldName("var");
            if (varNode) params.push(varNode.text);
          } else if (p.type === "identifier") {
            params.push(p.text);
          } else if (p.type === "self_method") {
            params.push("self");
          } else if (p.type === "as_identifier") {
            const id = p.namedChildren.find((c: Parser.SyntaxNode) => c.type === "identifier");
            if (id) params.push(id.text);
          }
        }
      }
      const pre = code.slice(Math.max(0, fn.startIndex - 4), fn.startIndex);
      const isPublic = /\bpub\s*$/.test(pre);
      functions.push({
        name: prefix + idNode.text,
        moduleName: modulePath.join("::") || undefined,
        body: bodyNode,
        startPosition: fn.startPosition,
        endPosition: fn.endPosition,
        params,
        isPublic,
      });
    }
  }

  const moduleNodes = walk(tree.rootNode, "module");
  for (const m of moduleNodes) {
    const idNode = m.namedChildren.find((c: Parser.SyntaxNode) => c.type === "identifier");
    const bodyNode = m.namedChildren.find((c: Parser.SyntaxNode) => c.type === "body");
    if (idNode) {
      modules.push({ name: idNode.text, body: bodyNode });
    }
  }

  function extractImports(node: Parser.SyntaxNode, prefix: string[] = []): void {
    if (node.type === 'import') {
      const segs: string[] = [];
      let idx = 0;
      while (idx < node.namedChildCount && node.namedChildren[idx].type === 'import_identifier') {
        segs.push(node.namedChildren[idx].text.replace(/::$/, ''));
        idx++;
      }
      if (idx < node.namedChildCount) {
        extractImports(node.namedChildren[idx], [...prefix, ...segs]);
        if (idx + 1 < node.namedChildCount && node.namedChildren[idx + 1].type === 'as_identifier') {
          const last = uses.pop();
          if (last) {
            const id = node.namedChildren[idx + 1].namedChildren.find(c => c.type === 'identifier');
            if (id) last.alias = id.text;
            uses.push(last);
          }
        }
      }
    } else if (node.type === 'import_body') {
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChildren[i];
        if (child.type === 'import_identifier') {
          const seg = child.text.replace(/::$/, '');
          if (i + 1 < node.namedChildCount) {
            extractImports(node.namedChildren[i + 1], [...prefix, seg]);
            i++; // skip next
          }
        } else if (child.type === 'identifier') {
          const path = [...prefix, child.text].join('::');
          uses.push({ alias: child.text, path });
          if (i + 1 < node.namedChildCount && node.namedChildren[i + 1].type === 'as_identifier') {
            const id = node.namedChildren[i + 1].namedChildren.find(c => c.type === 'identifier');
            if (id) uses[uses.length - 1].alias = id.text;
            i++;
          }
        } else if (child.type === 'import_body') {
          extractImports(child, prefix);
        } else if (child.type === '*') {
          uses.push({ alias: '*', path: [...prefix].join('::') + '::*' });
        }
      }
    } else if (node.type === 'identifier') {
      const path = [...prefix, node.text].join('::');
      uses.push({ alias: node.text, path });
    } else if (node.type === '*') {
      uses.push({ alias: '*', path: [...prefix].join('::') + '::*' });
    }
  }

  for (const n of walk(tree.rootNode, 'import')) {
    extractImports(n);
  }

  return { ast: { functions, modules, uses }, tree };
}

export function noirAstToGraph(ast: NoirAST): ContractGraph {
  const graph: ContractGraph = { nodes: [], edges: [] };
  const funcMap = new Map<string, ContractNode>();
  const edgeSet = new Set<string>();
  const useMap = new Map<string, string>();
  const wildcard: string[] = [];
  ast.uses?.forEach(u => {
    if (u.alias === '*' && u.path.endsWith('::*')) {
      wildcard.push(u.path.slice(0, -3));
    } else {
      useMap.set(u.alias, u.path);
    }
  });

  for (const f of ast.functions) {
    const funcParts = f.name.split("::");
    const node: ContractNode = {
      id: f.name,
      label: `${funcParts[funcParts.length - 1]}()`,
      type: GraphNodeKind.Function,
      contractName: f.moduleName || "Contract",
      parameters: f.params || [],
      functionType: f.isPublic ? "public" : "regular",
    };
    graph.nodes.push(node);
    funcMap.set(f.name, node);
  }

  for (const f of ast.functions) {
    if (!f.body) continue;
    const from = f.name;
    const calls = [
      ...walk(f.body, "function_call"),
      ...walk(f.body, "call_expression"),
    ];
    for (const call of calls) {
      const funcNode =
        call.childForFieldName("function") ||
        call.namedChildren.find((c: Parser.SyntaxNode) => c.type !== "arguments");
      if (!funcNode) continue;
      let to = funcNode.text.trim();
      to = to.replace(/^self\./, "");
      to = to.replace(/<[^>]*>/g, "");
      if (to.endsWith("::")) to = to.slice(0, -2);
      if (to.includes(".")) {
        const parts = to.split(".");
        if (parts.length === 2) {
          const [obj, method] = parts;
          to = `${obj}::${method}`;
        }
      }
      if (useMap.has(to)) {
        to = useMap.get(to)!;
      } else {
        const segs = to.split("::");
        if (segs.length > 1 && useMap.has(segs[0])) {
          to = [useMap.get(segs[0])!, ...segs.slice(1)].join("::");
        }
        if (!funcMap.has(to)) {
          for (const w of wildcard) {
            const cand = `${w}::${to}`;
            if (funcMap.has(cand)) {
              to = cand;
              break;
            }
          }
        }
      }
      const key = `${from}->${to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        if (!funcMap.has(to)) {
          const parts = to.split("::");
          const funcName = parts.pop() || to;
          graph.nodes.push({
            id: to,
            label: `${funcName}()`,
            type: GraphNodeKind.Function,
            contractName: parts.join("::") || "Contract",
          });
          funcMap.set(to, graph.nodes[graph.nodes.length - 1]);
        }
        graph.edges.push({ from, to, label: "" });
      }
    }
  }

  return graph;
}

export function parseNoirContract(code: string): ContractGraph {
  const { ast } = parseNoir(code);
  return noirAstToGraph(ast);
}
