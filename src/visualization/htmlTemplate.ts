import { VISUALIZATION_TEMPLATE } from './visualizationTemplate';

export function generateVisualizationHtml(
    mermaidDiagram: string,
    mermaidScriptUri: string,
    functionTypeFilters: { value: string; label: string; }[]
): string {
    const filtersJson = JSON.stringify(functionTypeFilters);
    return VISUALIZATION_TEMPLATE
        .replace('{{MERMAID_DIAGRAM}}', mermaidDiagram)
        .replace('{{MERMAID_SCRIPT_URI}}', mermaidScriptUri)
        .replace('{{FILTERS_JSON}}', filtersJson);
}
