import { VISUALIZATION_TEMPLATE } from './visualizationTemplate';

export function generateVisualizationHtml(
    mermaidDiagram: string,
    mermaidScriptUri: string,
    functionTypeFilters: { value: string; label: string; }[],
    webviewScriptUri: string
): string {
    const filtersJson = JSON.stringify(functionTypeFilters);
    const cspMetaTag = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' vscode-resource:; script-src \'self\' vscode-resource:; style-src \'self\' vscode-resource:; img-src \'self\' vscode-resource:;">';
    return VISUALIZATION_TEMPLATE.replace('<head>', `<head>${cspMetaTag}`)
        .replace('{{MERMAID_DIAGRAM}}', mermaidDiagram)
        .replace('{{MERMAID_SCRIPT_URI}}', mermaidScriptUri)
        .replace('{{FILTERS_JSON}}', filtersJson)
        .replace('{{WEBVIEW_SCRIPT_URI}}', webviewScriptUri);
}
