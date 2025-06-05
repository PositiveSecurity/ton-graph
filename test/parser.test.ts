import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', { window: { createOutputChannel: () => ({ appendLine: () => {} }) } });
import { parseContractByLanguage } from '../src/parser/parserUtils';
import * as fs from 'fs';
import * as path from 'path';

describe('Parser', () => {
    it('parses FunC sample', async () => {
        const code = fs.readFileSync(path.join(__dirname, 'func_sample.fc'), 'utf-8');
        const graph = await parseContractByLanguage(code, 'func');
        expect(graph.nodes.length).to.equal(3);
        expect(graph.edges.length).to.equal(3);
    });

    it('parses Tact sample', async () => {
        const code = fs.readFileSync(path.join(__dirname, 'tact_sample.tact'), 'utf-8');
        const graph = await parseContractByLanguage(code, 'tact');
        expect(graph.nodes.length).to.equal(4);
        expect(graph.edges.length).to.equal(3);
    });

    it('parses Tolk sample', async () => {
        const code = fs.readFileSync(path.join(__dirname, 'tolk_sample.tolk'), 'utf-8');
        const graph = await parseContractByLanguage(code, 'tolk');
        expect(graph.nodes.length).to.equal(2);
        expect(graph.edges.length).to.equal(1);
    });
});
