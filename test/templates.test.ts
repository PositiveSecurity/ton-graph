import { expect } from 'chai';
import { generateErrorHtml, filterMermaidDiagram } from '../src/visualization/templates';

describe('templates utilities', () => {
  it('escapes error message in HTML', () => {
    const html = generateErrorHtml('<tag>&');
    expect(html).to.include('&lt;tag&gt;&amp;');
    expect(html).to.include('Error Occurred');
  });

  it('filters nodes by type', () => {
    const diagram = 'graph TB;\nA_impure["A"]\nB_regular["B"]\nA_impure --> B_regular';
    const out = filterMermaidDiagram(diagram, ['regular']);
    expect(out).to.include('B_regular');
    expect(out).not.to.include('A_impure["A"]');
  });

  it('filters by name but keeps connected nodes', () => {
    const diagram = 'graph TB;\nA_impure["A"]\nB_regular["B"]\nA_impure --> B_regular';
    const out = filterMermaidDiagram(diagram, ['impure', 'regular'], 'A');
    expect(out).to.include('A_impure');
    expect(out).to.include('B_regular');
  });

  it('removes duplicate graph directives', () => {
    const invalid = 'graph TB;\nsubgraph X\n graph LR;\n A_impure --> B_regular\nend';
    const out = filterMermaidDiagram(invalid, ['impure', 'regular']);
    expect(out.match(/^graph /gm)?.length).to.equal(1);
  });

  it('removes spaced duplicate directives', () => {
    const invalid = 'graph TB;\nsubgraph Y\n  graph    LR \n  A_impure --> B_regular\nend';
    const out = filterMermaidDiagram(invalid, ['impure', 'regular']);
    expect(out.match(/^(graph|flowchart)/gm)?.length).to.equal(1);
  });

  it('removes duplicate flowchart directive without semicolon', () => {
    const invalid = 'graph TB;\nflowchart RL\nA_impure --> B_regular';
    const out = filterMermaidDiagram(invalid, ['impure', 'regular']);
    expect(out.match(/^(graph|flowchart)/gm)?.length).to.equal(1);
  });

  it('defaults to all types when none are selected', () => {
    const diagram = 'graph TB;\nA_impure["A"]\nB_regular["B"];';
    const out = filterMermaidDiagram(diagram, [] as any);
    expect(out).to.include('A_impure');
    expect(out).to.include('B_regular');
  });

  it('filters by name and drops unconnected nodes', () => {
    const diagram =
      'graph TB;\nA_regular["A"]\nB_impure["B"]\nC_regular["C"]\nD_impure["D"]\nA_regular --> B_impure\nC_regular --> D_impure';
    const out = filterMermaidDiagram(diagram, ['impure', 'regular'], 'B');
    expect(out).to.include('A_regular');
    expect(out).to.include('B_impure');
    expect(out).not.to.include('C_regular');
    expect(out).not.to.include('D_impure');
  });

  it('adds a graph directive when missing', () => {
    const diagram = 'A_impure --> B_regular';
    const out = filterMermaidDiagram(diagram, ['impure', 'regular']);
    expect(out.trim().startsWith('graph TB;')).to.be.true;
  });

  it('handles subgraph directives with extra whitespace', () => {
    const invalid = 'graph TB;\nsubgraph    Z  \n  graph   LR \n  A_impure --> B_regular\nend';
    const out = filterMermaidDiagram(invalid, ['impure', 'regular']);
    expect(out.match(/^(graph|flowchart)/gm)?.length).to.equal(1);
  });
});
