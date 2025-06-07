import { expect } from "chai";
import mock = require("mock-require");

const vscode = {
  workspace: { onDidChangeTextDocument: () => {} },
  SymbolKind: { Function: 12 },
  Range: class {
    start: { line: number; character: number };
    end: { line: number; character: number };
    constructor(sl: number, sc: number, el: number, ec: number) {
      this.start = { line: sl, character: sc };
      this.end = { line: el, character: ec };
    }
  },
  DocumentSymbol: class {
    name: string;
    detail: string;
    kind: number;
    range: any;
    selectionRange: any;
    constructor(
      name: string,
      detail: string,
      kind: number,
      range: any,
      sel: any,
    ) {
      this.name = name;
      this.detail = detail;
      this.kind = kind;
      this.range = range;
      this.selectionRange = sel;
    }
  },
};

mock("vscode", vscode);
import { GraphProvider } from "../src/core/graphProvider";
import { movelangAdapter } from "../src/languages/move";

describe("GraphProvider", () => {
  it("returns symbol ranges from AST", () => {
    const code = [
      "module M {",
      "  fun foo() {",
      "    bar();",
      "  }",
      "",
      "  fun bar() {}",
      "}",
    ].join("\n");
    const doc: any = { getText: () => code, version: 1, uri: {} };
    const provider = new GraphProvider(movelangAdapter);
    const symbols = provider.provideDocumentSymbols(doc) as any[];
    expect(symbols.length).to.equal(2);
    const foo = symbols[0];
    const bar = symbols[1];
    expect(foo.name).to.equal("foo");
    expect(foo.range.start.line).to.equal(1);
    expect(foo.range.end.line).to.equal(3);
    expect(bar.name).to.equal("bar");
    expect(bar.range.start.line).to.equal(5);
  });
});
