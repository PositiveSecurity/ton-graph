import * as vscode from 'vscode';
import * as path from 'path';
import { filterMermaidDiagram, generateVisualizationHtml } from '../visualization/templates';
import logger from '../logging/logger';

function isValidBase64(str: string): boolean {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str.replace(/\r?\n/g, '');
    } catch {
        return false;
    }
}

function isValidDataUrl(url: string, mime: string): boolean {
    const prefix = `data:${mime};base64,`;
    if (!url.startsWith(prefix)) {
        return false;
    }
    return isValidBase64(url.slice(prefix.length));
}

function isValidSvg(content: string): boolean {
    if (isValidDataUrl(content, 'image/svg+xml')) {
        return true;
    }
    return /^<svg[\s\S]*<\/svg>$/.test(content.trim());
}

// URI to the bundled Mermaid script
let bundledMermaidUri: vscode.Uri | undefined;

export async function handleExport(
    panel: vscode.WebviewPanel,
    message: any,
    context: vscode.ExtensionContext
): Promise<void> {
    try {
        logger.info(`handleExport received command ${message.command}`);
        // Get the current file name without extension
        const editor = vscode.window.activeTextEditor;
        let baseFileName = "diagram";
        let basePath = "";

        if (editor) {
            const filePath = editor.document.fileName;
            const fileDir = path.dirname(filePath);
            const fileNameWithExt = path.basename(filePath);
            baseFileName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')) || fileNameWithExt;
            basePath = fileDir;
        }

        switch (message.command) {
            case 'saveMermaid':
                logger.debug('Exporting Mermaid diagram');
                await handleMermaidExport(panel, message, baseFileName, basePath);
                break;
            case 'saveSvg':
                logger.debug('Exporting SVG diagram');
                await handleSvgExport(panel, message, baseFileName, basePath);
                break;
            case 'savePng':
                logger.debug('Exporting PNG diagram');
                await handlePngExport(panel, message, baseFileName, basePath);
                break;
            case 'saveJpg':
                logger.debug('Exporting JPG diagram');
                await handleJpgExport(panel, message, baseFileName, basePath);
                break;
            case 'applyFilters':
                logger.debug('Applying filters via export handler');
                await handleApplyFilters(panel, message, context);
                break;
            case 'mermaidContent':
            case 'svgContent':
            case 'pngData':
            case 'jpgData':
                // These are response messages from the webview, not commands to handle
                break;
        }
    } catch (error: any) {
        logger.error('Error handling export', error);
        vscode.window.showErrorMessage(`Error handling export: ${error.message || String(error)}`);
        panel.webview.postMessage({
            command: 'saveResult',
            success: false,
            error: error.message || String(error)
        });
    }
}

async function handleApplyFilters(
    panel: vscode.WebviewPanel,
    message: any,
    context: vscode.ExtensionContext
): Promise<void> {
    try {
        logger.info('Applying filters from export handler');
        const { selectedTypes, nameFilter } = message;

        // Get original graph content
        panel.webview.postMessage({ command: 'getMermaidContent' });

        // Wait for the response with the original graph
        const response = await new Promise<any>((resolve) => {
            const disposable = panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'mermaidContent') {
                    disposable.dispose();
                    resolve(message);
                }
            });
        });

        const originalGraph = response.content;

        if (!originalGraph) {
            logger.error('No original graph data received');
            throw new Error('No original graph data received');
        }

        // Get the filtered diagram
        const filteredDiagram = filterMermaidDiagram(originalGraph, selectedTypes, nameFilter);

        // Get Mermaid script URI (either cached or from CDN)
        const mermaidScriptUri = await getMermaidScriptUri(context, panel.webview);
        const webviewScriptUri = await getWebviewScriptUri(context, panel.webview);
        const theme = vscode.workspace.getConfiguration('ton-graph').get<string>('theme', 'default');

        // Define function type filters based on selected types
        const functionTypeFilters = [
            { value: 'regular', label: 'Regular' },
            { value: 'inline', label: 'Inline' },
            { value: 'impure', label: 'Impure' },
            { value: 'method_id', label: 'Method ID' }
        ].filter(filter => selectedTypes.includes(filter.value));

        // Update the webview content
        try {
            const html = generateVisualizationHtml(filteredDiagram, mermaidScriptUri, functionTypeFilters, webviewScriptUri, panel.webview, theme);
            panel.webview.html = html;

            // Notify the webview that filters have been applied
            panel.webview.postMessage({
                command: 'filtersApplied',
                success: true,
                selectedTypes,
                nameFilter
            });
            logger.info('Filters applied successfully');
        } catch (updateError) {
            logger.error('Error updating webview content', updateError);
            throw updateError;
        }
    } catch (error: any) {
        logger.error('Error applying filters', error);
        panel.webview.postMessage({
            command: 'filtersApplied',
            success: false,
            error: error.message || 'Unknown error'
        });
        throw new Error(`Failed to apply filters: ${error.message}`);
    }
}

/**
 * Get the Mermaid script URI bundled with the extension
 */
async function getMermaidScriptUri(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<string> {
    if (!bundledMermaidUri) {
        const filePath = path.join(context.extensionPath, 'cached', 'mermaid.min.js');
        bundledMermaidUri = vscode.Uri.file(filePath);
        try {
            const fileUrl = bundledMermaidUri.with({ scheme: 'file' }).toString();
            await import(fileUrl);
        } catch {
            // Ignore import errors as the file may not be a valid module
        }
    }
    return webview.asWebviewUri(bundledMermaidUri).toString();
}

async function getWebviewScriptUri(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<string> {
    const filePath = path.join(context.extensionPath, 'dist', 'webview.js');
    const uri = vscode.Uri.file(filePath);
    return webview.asWebviewUri(uri).toString();
}

async function handleMermaidExport(
    panel: vscode.WebviewPanel,
    message: any,
    baseFileName: string,
    basePath: string
): Promise<void> {
    logger.info('Starting Mermaid export');
    // Get the current diagram content from the webview
    panel.webview.postMessage({ command: 'getMermaidContent' });

    // Wait for the response
    const response = await new Promise<any>((resolve) => {
        const disposable = panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'mermaidContent') {
                disposable.dispose();
                resolve(message);
            }
        });
    });

    const mermaidContent = response.content;
    const mermaidUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(basePath, `${baseFileName}.mmd`)),
        filters: {
            'Mermaid Files': ['mmd'],
            'All Files': ['*']
        }
    });

    if (mermaidUri) {
        const encoder = new TextEncoder();
        const data = encoder.encode(mermaidContent);
        await vscode.workspace.fs.writeFile(mermaidUri, data);
        vscode.window.showInformationMessage('Mermaid diagram saved successfully!');
        logger.info(`Mermaid diagram saved at ${mermaidUri.fsPath}`);
        panel.webview.postMessage({
            command: 'saveResult',
            success: true,
            type: 'mermaid',
            path: mermaidUri.fsPath
        });
    }
}

async function handleSvgExport(
    panel: vscode.WebviewPanel,
    message: any,
    baseFileName: string,
    basePath: string
): Promise<void> {
    logger.info('Starting SVG export');
    // Get the current SVG content from the webview
    panel.webview.postMessage({ command: 'getSvgContent' });

    // Wait for the response
    const response = await new Promise<any>((resolve) => {
        const disposable = panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'svgContent') {
                disposable.dispose();
                resolve(message);
            }
        });
    });

    const svgContent = response.content;

    if (typeof svgContent !== 'string' || !isValidSvg(svgContent)) {
        logger.error('Invalid SVG content format', typeof svgContent === 'string' ? svgContent.substring(0, 50) + '...' : 'not a string');
        throw new Error('Invalid SVG content');
    }
    const svgUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(basePath, `${baseFileName}.svg`)),
        filters: {
            'SVG Files': ['svg'],
            'All Files': ['*']
        }
    });

    if (svgUri) {
        const encoder = new TextEncoder();
        const data = encoder.encode(svgContent);
        await vscode.workspace.fs.writeFile(svgUri, data);
        vscode.window.showInformationMessage('SVG diagram saved successfully!');
        logger.info(`SVG diagram saved at ${svgUri.fsPath}`);
        panel.webview.postMessage({
            command: 'saveResult',
            success: true,
            type: 'svg',
            path: svgUri.fsPath
        });
    }
}

async function handlePngExport(
    panel: vscode.WebviewPanel,
    message: any,
    baseFileName: string,
    basePath: string
): Promise<void> {
    logger.info('Starting PNG export');
    // Show save dialog first
    const pngUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(basePath, `${baseFileName}.png`)),
        filters: {
            'PNG Files': ['png'],
            'All Files': ['*']
        }
    });

    if (pngUri) {
        try {
            // Get SVG content
            const svgContent = message.content;

            if (typeof svgContent !== 'string' || !isValidSvg(svgContent)) {
                logger.error('Invalid SVG content format', typeof svgContent === 'string' ? svgContent.substring(0, 50) + '...' : 'not a string');
                throw new Error('Invalid SVG content');
            }

            // Convert SVG to PNG using the webview
            panel.webview.postMessage({
                command: 'convertToPng'
            });

            // Wait for the PNG data with timeout
            const pngResponse = await Promise.race([
                new Promise<any>((resolve) => {
                    const disposable = panel.webview.onDidReceiveMessage(msg => {
                        if (msg.command === 'pngData') {
                            disposable.dispose();
                            resolve(msg);
                        }
                    });
                }),
                new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout waiting for PNG data')), 30000)
                )
            ]);


            if (!pngResponse || !pngResponse.content) {
                throw new Error('No PNG data received from webview');
            }

            const pngDataUrl = pngResponse.content;

            if (!isValidDataUrl(pngDataUrl, 'image/png')) {
                logger.error('Invalid PNG data URL format', typeof pngDataUrl === 'string' ? pngDataUrl.substring(0, 50) + '...' : 'not a string');
                throw new Error('Invalid PNG data URL format');
            }

            const pngBase64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
            const pngBinary = Buffer.from(pngBase64, 'base64');

            await vscode.workspace.fs.writeFile(pngUri, pngBinary);
            vscode.window.showInformationMessage('PNG diagram saved successfully!');
            panel.webview.postMessage({
                command: 'saveResult',
                success: true,
                type: 'png',
                path: pngUri.fsPath
            });
        } catch (error: any) {
            logger.error('Error in PNG export', error);
            vscode.window.showErrorMessage(`Failed to export PNG: ${error.message}`);
            throw error;
        }
    }
}

async function handleJpgExport(
    panel: vscode.WebviewPanel,
    message: any,
    baseFileName: string,
    basePath: string
): Promise<void> {
    logger.info('Starting JPG export');
    // Show save dialog first
    const jpgUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(basePath, `${baseFileName}.jpg`)),
        filters: {
            'JPEG Files': ['jpg', 'jpeg'],
            'All Files': ['*']
        }
    });

    if (jpgUri) {
        try {
            // Get SVG content
            const svgContent = message.content;

            if (typeof svgContent !== 'string' || !isValidSvg(svgContent)) {
                logger.error('Invalid SVG content format', typeof svgContent === 'string' ? svgContent.substring(0, 50) + '...' : 'not a string');
                throw new Error('Invalid SVG content');
            }

            // Convert SVG to JPG using the webview
            panel.webview.postMessage({
                command: 'convertToJpg'
            });

            // Wait for the JPG data with timeout
            const jpgResponse = await Promise.race([
                new Promise<any>((resolve) => {
                    const disposable = panel.webview.onDidReceiveMessage(msg => {
                        if (msg.command === 'jpgData') {
                            disposable.dispose();
                            resolve(msg);
                        }
                    });
                }),
                new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout waiting for JPG data')), 30000)
                )
            ]);


            if (!jpgResponse || !jpgResponse.content) {
                throw new Error('No JPG data received from webview');
            }

            const jpgDataUrl = jpgResponse.content;

            if (!isValidDataUrl(jpgDataUrl, 'image/jpeg')) {
                logger.error('Invalid JPG data URL format', typeof jpgDataUrl === 'string' ? jpgDataUrl.substring(0, 50) + '...' : 'not a string');
                throw new Error('Invalid JPG data URL format');
            }

            const jpgBase64 = jpgDataUrl.replace(/^data:image\/jpeg;base64,/, '');
            const jpgBinary = Buffer.from(jpgBase64, 'base64');

            await vscode.workspace.fs.writeFile(jpgUri, jpgBinary);
            vscode.window.showInformationMessage('JPG diagram saved successfully!');
            logger.info(`JPG diagram saved at ${jpgUri.fsPath}`);
            panel.webview.postMessage({
                command: 'saveResult',
                success: true,
                type: 'jpg',
                path: jpgUri.fsPath
            });
        } catch (error: any) {
            logger.error('Error in JPG export', error);
            vscode.window.showErrorMessage(`Failed to export JPG: ${error.message}`);
            throw error;
        }
    }
}
