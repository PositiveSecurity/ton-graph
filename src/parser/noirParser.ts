import Parser from "tree-sitter";
import Noir from "tree-sitter-noir";
import { ContractGraph, ContractNode } from "../types/graph";
import { GraphNodeKind } from "../types/graphNodeKind";

export interface NoirFunction {
  name: string;
  body?: Parser.SyntaxNode;
  startPosition: Parser.Point;
  endPosition: Parser.Point;
}

export interface NoirModule {
  name: string;
  body?: Parser.SyntaxNode;
  filePath?: string;
}

export interface NoirAST {
  functions: NoirFunction[];
  modules: NoirModule[];
}

let parser: Parser | null = null;
function getParser(): Parser {
  if (!parser) {
    parser = new Parser();
    parser.setLanguage(Noir as any);
  }
  return parser;
}

export function walk(
  node: Parser.SyntaxNode,
  type: string,
): Parser.SyntaxNode[] {
  const res: Parser.SyntaxNode[] = [];
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (n.type === type) res.push(n);
    stack.push(...n.namedChildren);
  }
  return res;
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
  const fnNodes = walk(tree.rootNode, "function_definition");
  for (const fn of fnNodes) {
    const idNode = fn.namedChildren.find((c) => c.type === "identifier");
    const bodyNode = fn.namedChildren.find((c) => c.type === "body");
    if (idNode) {
      let prefix = "";
      let parent: Parser.SyntaxNode | null = fn.parent;
      while (parent) {
        if (parent.type === "struct_method") {
          const structId = parent.namedChildren.find((c) => c.type === "identifier");
          if (structId) {
            prefix = `${structId.text}::`;
            break;
          }
        }
        parent = parent.parent;
      }
      functions.push({
        name: prefix + idNode.text,
        body: bodyNode,
        startPosition: fn.startPosition,
        endPosition: fn.endPosition,
      });
    }
  }

  const moduleNodes = walk(tree.rootNode, "module");
  for (const m of moduleNodes) {
    const idNode = m.namedChildren.find((c) => c.type === "identifier");
    const bodyNode = m.namedChildren.find((c) => c.type === "body");
    if (idNode) {
      modules.push({ name: idNode.text, body: bodyNode });
    }
  }

  return { ast: { functions, modules }, tree };
}

export function noirAstToGraph(ast: NoirAST): ContractGraph {
  const graph: ContractGraph = { nodes: [], edges: [] };
  const funcMap = new Map<string, ContractNode>();
  const edgeSet = new Set<string>();

  for (const f of ast.functions) {
    const node: ContractNode = {
      id: f.name,
      label: `${f.name}()`,
      type: GraphNodeKind.Function,
      contractName: "Contract",
      parameters: [],
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
        call.namedChildren.find((c) => c.type !== "arguments");
      if (!funcNode) continue;
      let to = funcNode.text;
      to = to.replace(/^self\./, "");
      to = to.replace(/<.*>/, "");
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
