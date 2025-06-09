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
      functions.push({
        name: prefix + idNode.text,
        moduleName: modulePath.join("::") || undefined,
        body: bodyNode,
        startPosition: fn.startPosition,
        endPosition: fn.endPosition,
        params,
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

  const useNodes = [
    ...walk(tree.rootNode, "use_declaration"),
    ...walk(tree.rootNode, "import"),
  ];
  for (const u of useNodes) {
    const text = u.text.replace(/\s+/g, " ");
    const match = text.match(/^use\s+([^;]+);/);
    if (!match) continue;
    const body = match[1].trim();
    if (/\{.*\}/.test(body)) {
      const g = body.match(/^(.*)::\{([^}]*)\}$/);
      if (g) {
        const base = g[1].trim();
        const items = g[2]
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        for (const it of items) {
          if (it === '*') {
            uses.push({ alias: '*', path: `${base}::*` });
          } else {
            const [name, al] = it.split(/\s+as\s+/);
            const alias = al ? al.trim() : name.trim();
            uses.push({ alias, path: `${base}::${name.trim()}` });
          }
        }
      }
    } else if (body.endsWith('::*')) {
      uses.push({ alias: '*', path: body });
    } else {
      const parts = body.split(/\s+as\s+/);
      const path = parts[0].trim();
      const alias = parts[1] ? parts[1].trim() : path.split("::").pop()!;
      uses.push({ alias, path });
    }
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
    const node: ContractNode = {
      id: f.name,
      label: `${f.name}()`,
      type: GraphNodeKind.Function,
      contractName: f.moduleName || "Contract",
      parameters: f.params || [],
      functionType: "regular",
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
          graph.nodes.push({
            id: to,
            label: `${to}()`,
            type: GraphNodeKind.Function,
            contractName: "Contract",
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
