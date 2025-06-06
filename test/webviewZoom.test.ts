import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import mock = require('mock-require');

describe('webview zoom controls', () => {
  let dom: JSDOM;

  beforeEach(async () => {
    const html = `<!DOCTYPE html>
      <div id="loadingOverlay"></div>
      <div class="mermaid-container">
        <div class="mermaid">
          <div id="mermaid-diagram">graph TB;</div>
        </div>
      </div>
      <div id="errorContainer"></div>
      <button id="zoomInBtn"></button>
      <button id="zoomOutBtn"></button>
      <button id="resetZoomBtn"></button>
      <button id="showCodeBtn">Show Code</button>
      <div id="logContainer"></div>
      <div id="codeDisplay" style="display:none"></div>
      <input id="nameFilter" />
      <div id="typeFilters"></div>`;
    dom = new JSDOM(html, { url: 'http://localhost' });
    (global as any).window = dom.window as any;
    (global as any).document = dom.window.document;
    (global as any).filterSet = [];
    (global as any).acquireVsCodeApi = () => ({ postMessage: () => {} });
    (global as any).mermaid = {
      initialize: () => {},
      render: () => Promise.resolve({ svg: '<svg></svg>' })
    };
    mock('dompurify', { default: { sanitize: (s: string) => s } });
    delete require.cache[require.resolve('../src/webview/index.ts')];
    require('../src/webview/index.ts');
    await new Promise(res => setTimeout(res, 0));
  });

  afterEach(() => {
    mock.stopAll();
    delete require.cache[require.resolve('../src/webview/index.ts')];
    dom.window.close();
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).filterSet;
    delete (global as any).acquireVsCodeApi;
    delete (global as any).mermaid;
  });

  it('updates svg transform on zoom buttons', () => {
    const svg = document.querySelector('.mermaid svg') as SVGElement;
    const zoomIn = document.getElementById('zoomInBtn')!;
    const zoomOut = document.getElementById('zoomOutBtn')!;
    const reset = document.getElementById('resetZoomBtn')!;

    zoomIn.dispatchEvent(new dom.window.Event('click'));
    let scale = parseFloat(svg.style.transform.replace(/scale\(([^)]+)\)/, '$1'));
    expect(scale).to.be.closeTo(1.05, 0.0001);

    zoomOut.dispatchEvent(new dom.window.Event('click'));
    scale = parseFloat(svg.style.transform.replace(/scale\(([^)]+)\)/, '$1'));
    expect(scale).to.be.closeTo(0.95, 0.0001);

    reset.dispatchEvent(new dom.window.Event('click'));
    expect(svg.style.transform).to.equal('scale(1)');
  });

  it('toggles code display via button', () => {
    const btn = document.getElementById('showCodeBtn')!;
    const codeDisplay = document.getElementById('codeDisplay') as HTMLElement;
    const container = document.querySelector('.mermaid-container') as HTMLElement;

    btn.dispatchEvent(new dom.window.Event('click'));
    expect(codeDisplay.style.display).to.equal('block');
    expect(container.style.display).to.equal('none');
    expect(btn.textContent).to.equal('Show Diagram');

    btn.dispatchEvent(new dom.window.Event('click'));
    expect(codeDisplay.style.display).to.equal('none');
    expect(container.style.display).to.equal('block');
    expect(btn.textContent).to.equal('Show Code');
  });
});
