import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import createDOMPurify = require('dompurify');

describe('webview sanitize', () => {
  it('removes script elements from SVG', () => {
    const { window } = new JSDOM('<!DOCTYPE html>');
    const DOMPurify = createDOMPurify(window as any);
    const dirty = '<svg><rect/><script>alert(1)</script></svg>';
    const clean = DOMPurify.sanitize(dirty, {USE_PROFILES: {svg: true, svgFilters: true}});
    expect(clean).to.not.include('<script>');
    expect(clean).to.include('<rect');
  });
});
