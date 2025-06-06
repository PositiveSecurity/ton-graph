import { VISUALIZATION_TEMPLATE } from './visualizationTemplate';
import * as vscode from 'vscode';

export function generateVisualizationHtml(
    mermaidDiagram: string,
    mermaidScriptUri: string,
    functionTypeFilters: { value: string; label: string; }[],
    webviewScriptUri: string,
    webview: vscode.Webview,
    theme = 'default'
): string {
    const filtersJson = JSON.stringify(functionTypeFilters);
    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' vscode-resource:; script-src 'nonce-${webview.cspSource}'; style-src 'self' vscode-resource:; img-src 'self' data: vscode-resource:">`;
    return VISUALIZATION_TEMPLATE.replace('<head>', `<head>${cspMetaTag}`)
        .replace('{{MERMAID_DIAGRAM}}', mermaidDiagram)
        .replace('{{MERMAID_SCRIPT_URI}}', mermaidScriptUri)
        .replace('{{FILTERS_JSON}}', filtersJson)
        .replace('{{WEBVIEW_SCRIPT_URI}}', webviewScriptUri)
        .replace('{{MERMAID_THEME}}', theme);
}
