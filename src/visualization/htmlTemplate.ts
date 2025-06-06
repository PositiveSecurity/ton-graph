import { VISUALIZATION_TEMPLATE } from './visualizationTemplate';
import * as vscode from 'vscode';

function getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
}

export function generateVisualizationHtml(
    mermaidDiagram: string,
    mermaidScriptUri: string,
    functionTypeFilters: { value: string; label: string; }[],
    webviewScriptUri: string,
    webview: vscode.Webview,
    theme = 'default'
): string {
    const nonce = getNonce();
    const filtersJson = JSON.stringify(functionTypeFilters);
    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}' vscode-resource:; img-src vscode-resource: data:">`;
    return VISUALIZATION_TEMPLATE.replace('<head>', `<head>${cspMetaTag}`)
        .replace(/{{NONCE}}/g, nonce)
        .replace('{{MERMAID_DIAGRAM}}', mermaidDiagram)
        .replace('{{MERMAID_SCRIPT_URI}}', mermaidScriptUri)
        .replace('{{FILTERS_JSON}}', filtersJson)
        .replace('{{WEBVIEW_SCRIPT_URI}}', webviewScriptUri)
        .replace('{{MERMAID_THEME}}', theme);
}
