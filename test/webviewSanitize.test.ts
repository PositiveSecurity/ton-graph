import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import createDOMPurify = require('dompurify');
import mock = require('mock-require');

describe('webview sanitize', () => {
  it('removes script elements from SVG', () => {
    const { window } = new JSDOM('<!DOCTYPE html>');
    const DOMPurify = createDOMPurify(window as any);
    const dirty = '<svg><rect/><script>alert(1)</script></svg>';
    const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['svg','rect'], ALLOWED_ATTR: [], SAFE_FOR_TEMPLATES: true });
    expect(clean).to.not.include('<script>');
    expect(clean).to.include('<rect');
  });

  it('removes event handler attributes from SVG', () => {
    const { window } = new JSDOM('<!DOCTYPE html>');
    const DOMPurify = createDOMPurify(window as any);
    const dirty = '<svg onload="alert(1)"><rect/></svg>';
    const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['svg','rect'], ALLOWED_ATTR: ['width','height'], SAFE_FOR_TEMPLATES: true });
    expect(clean).to.not.include('onload');
  });

  it('neutralizes javascript links', async () => {
    const html = `<!DOCTYPE html>
      <div id="mermaid-diagram"></div>`;
    const dom = new JSDOM(html, { url: 'http://localhost' });
    (global as any).window = dom.window as any;
    (global as any).document = dom.window.document;
    (global as any).filterSet = [];
    (global as any).acquireVsCodeApi = () => ({ postMessage: () => {} });
    (global as any).mermaid = {
      initialize: () => {},
      render: () => Promise.resolve({ svg: '<svg><a href="javascript:alert(1)">bad</a></svg>' })
    };

    mock('dompurify', { default: { sanitize: (s: string) => s } });
    delete require.cache[require.resolve('../src/webview/index.ts')];
    require('../src/webview/index.ts');

    await new Promise(res => setTimeout(res, 0));

    const link = dom.window.document.querySelector('a')!;
    expect(link.hasAttribute('href')).to.be.false;

    mock.stopAll();
    delete require.cache[require.resolve('../src/webview/index.ts')];
    dom.window.close();
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).filterSet;
    delete (global as any).acquireVsCodeApi;
    delete (global as any).mermaid;
  });

  it('enforces rel and target on external links', async () => {
    const html = `<!DOCTYPE html>
      <div id="mermaid-diagram"></div>`;
    const dom = new JSDOM(html, { url: 'http://localhost' });
    (global as any).window = dom.window as any;
    (global as any).document = dom.window.document;
    (global as any).filterSet = [];
    (global as any).acquireVsCodeApi = () => ({ postMessage: () => {} });
    (global as any).mermaid = {
      initialize: () => {},
      render: () => Promise.resolve({ svg: '<svg><a href="http://example.com">ok</a></svg>' })
    };

    mock('dompurify', { default: { sanitize: (s: string) => s } });
    delete require.cache[require.resolve('../src/webview/index.ts')];
    require('../src/webview/index.ts');

    await new Promise(res => setTimeout(res, 0));

    const link = dom.window.document.querySelector('a')!;
    expect(link.getAttribute('target')).to.equal('_blank');
    expect(link.getAttribute('rel')).to.equal('noopener noreferrer');

    mock.stopAll();
    delete require.cache[require.resolve('../src/webview/index.ts')];
    dom.window.close();
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).filterSet;
    delete (global as any).acquireVsCodeApi;
    delete (global as any).mermaid;
  });

  it('ignores malicious message events', async () => {
    const html = `<!DOCTYPE html>
      <div id="mermaid-diagram"></div>`;
    const dom = new JSDOM(html, { url: 'http://localhost' });
    (global as any).window = dom.window as any;
    (global as any).document = dom.window.document;
    (global as any).filterSet = [];
    (global as any).acquireVsCodeApi = () => ({ postMessage: () => {} });
    (global as any).mermaid = {
      initialize: () => {},
      render: () => Promise.resolve({ svg: '<svg></svg>' })
    };

    const DOMPurify = createDOMPurify(dom.window as any);
    const sanitizeMock = (s: string) => DOMPurify.sanitize(s, { ALLOWED_TAGS: ['svg'], ALLOWED_ATTR: [], SAFE_FOR_TEMPLATES: true });
    mock('dompurify', { default: { sanitize: sanitizeMock } });
    delete require.cache[require.resolve('../src/webview/index.ts')];
    require('../src/webview/index.ts');

    await new Promise(res => setTimeout(res, 0));

    const container = dom.window.document.getElementById('mermaid-diagram')!;
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      data: { command: 'updateDiagram', diagram: '<svg><script>alert(1)</script></svg>' }
    }));
    expect(container.innerHTML).to.not.include('<script>');

    const initial = container.innerHTML;
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: '<script>alert(1)</script>' }));
    expect(container.innerHTML).to.equal(initial);

    mock.stopAll();
    delete require.cache[require.resolve('../src/webview/index.ts')];
    dom.window.close();
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).filterSet;
    delete (global as any).acquireVsCodeApi;
    delete (global as any).mermaid;
  });
});
