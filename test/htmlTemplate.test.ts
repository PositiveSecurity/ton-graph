import { expect } from "chai";
import { generateVisualizationHtml } from "../src/visualization/templates";

describe("generateVisualizationHtml", () => {
  it("injects CSP meta tag and replaces placeholders", () => {
    const webview = { cspSource: "test-csp" } as any;
    const html = generateVisualizationHtml(
      "graph TB;",
      "mermaid.js",
      [{ value: "regular", label: "Regular" }],
      "script.js",
      webview,
      "dark"
    );
    expect(html).to.include("Content-Security-Policy");
    expect(html).to.include(`nonce-${webview.cspSource}`);
    expect(html).to.include("graph TB;");
    expect(html).to.include("mermaid.js");
    expect(html).to.include("script.js");
    expect(html).to.not.include("{{MERMAID_DIAGRAM}}");
    expect(html).to.not.include("{{MERMAID_SCRIPT_URI}}");
    expect(html).to.not.include("{{WEBVIEW_SCRIPT_URI}}");
    expect(html).to.include("dark");
  });
});
