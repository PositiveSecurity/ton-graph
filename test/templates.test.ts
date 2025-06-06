import { expect } from 'chai';
import { generateErrorHtml, filterMermaidDiagram } from '../src/visualization/templates';

describe('templates utilities', () => {
  it('escapes error message in HTML', () => {
    const html = generateErrorHtml('<tag>');
    expect(html).to.include('&lt;tag&gt;');
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
    expect(out.match(/graph /g)?.length).to.equal(1);
  });
});
