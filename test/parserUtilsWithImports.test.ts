import { expect } from 'chai';
import mock = require('mock-require');

// mock vscode minimal
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });

let calledWith: any;
const processImportsStub = async (...args: any[]) => {
  calledWith = args;
  return { importedCode: 'int lib() { return 1; }', importedFilePaths: [], cycles: [] };
};
mock('../src/parser/importHandler.ts', { processImports: processImportsStub });

const parserUtils = require('../src/parser/parserUtils');

describe('parserUtils.parseContractWithImports', () => {
  after(() => {
    mock.stop('../src/parser/importHandler.ts');
  });

  it('combines imported code before parsing', async () => {
    let parseArgs: any;
    parserUtils.parseContractByLanguage = async (code: string, lang: string) => { parseArgs = [code, lang]; return { nodes: [], edges: [] }; };

    await parserUtils.parseContractWithImports('int main(){}', '/tmp/main.fc', 'func');

    expect(calledWith).to.deep.equal(['int main(){}', '/tmp/main.fc', 'func']);
    expect(parseArgs).to.deep.equal(['int lib() { return 1; }\n\nint main(){}', 'func']);
  });
});
