import * as vscode from 'vscode';
import * as path from 'path';
import { filterMermaidDiagram, generateVisualizationHtml } from '../visualization/templates';

// Reference to cached Mermaid URI
let cachedMermaidUri: vscode.Uri | undefined;

export async function handleExport(
    panel: vscode.WebviewPanel,
    message: any,
    context: vscode.ExtensionContext
): Promise<void> {
    try {
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
                await handleMermaidExport(panel, message, baseFileName, basePath);
                break;
            case 'saveSvg':
                await handleSvgExport(panel, message, baseFileName, basePath);
                break;
            case 'savePng':
                await handlePngExport(panel, message, baseFileName, basePath);
                break;
            case 'saveJpg':
                await handleJpgExport(panel, message, baseFileName, basePath);
                break;
            case 'applyFilters':
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
        console.error('Error handling export:', error);
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
            console.error('No original graph data received');
            throw new Error('No original graph data received');
        }

        // Get the filtered diagram
        const filteredDiagram = filterMermaidDiagram(originalGraph, selectedTypes, nameFilter);

        // Get Mermaid script URI (either cached or from CDN)
        const mermaidScriptUri = await getMermaidScriptUri(context, panel.webview);

        // Define function type filters based on selected types
        const functionTypeFilters = [
            { value: 'regular', label: 'Regular' },
            { value: 'inline', label: 'Inline' },
            { value: 'impure', label: 'Impure' },
            { value: 'method_id', label: 'Method ID' }
        ].filter(filter => selectedTypes.includes(filter.value));

        // Update the webview content
        try {
            const html = generateVisualizationHtml(filteredDiagram, mermaidScriptUri, functionTypeFilters);
            panel.webview.html = html;

            // Notify the webview that filters have been applied
            panel.webview.postMessage({
                command: 'filtersApplied',
                success: true,
                selectedTypes,
                nameFilter
            });
        } catch (updateError) {
            console.error('Error updating webview content:', updateError);
            throw updateError;
        }
    } catch (error: any) {
        console.error('Error applying filters:', error);
        panel.webview.postMessage({
            command: 'filtersApplied',
            success: false,
            error: error.message || 'Unknown error'
        });
        throw new Error(`Failed to apply filters: ${error.message}`);
    }
}

/**
 * Get the Mermaid script URI, either from cache or fall back to CDN
 */
async function getMermaidScriptUri(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<string> {
    // Default CDN URL
    const cdnUrl = "https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js";

    // Check if we already have a cached version
    if (cachedMermaidUri) {
        return webview.asWebviewUri(cachedMermaidUri).toString();
    }

    try {
        // Try to find the cached file
        const cachedDir = vscode.Uri.joinPath(context.extensionUri, 'cached');
        const localMermaidPath = vscode.Uri.joinPath(cachedDir, 'mermaid.min.js');

        try {
            // Check if file exists locally
            await vscode.workspace.fs.stat(localMermaidPath);
            console.log('Using cached Mermaid library in exportHandler');
            cachedMermaidUri = localMermaidPath;
            return webview.asWebviewUri(localMermaidPath).toString();
        } catch {
            // File doesn't exist, use CDN
            console.log('No cached Mermaid found, using CDN in exportHandler');
            return cdnUrl;
        }
    } catch (error) {
        console.error('Error checking cached Mermaid:', error);
        return cdnUrl;
    }
}

async function handleMermaidExport(
    panel: vscode.WebviewPanel,
    message: any,
    baseFileName: string,
    basePath: string
): Promise<void> {
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
            console.log('PNG export: Got SVG content, length:', svgContent.length);

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

            console.log('PNG export: Received response');

            if (!pngResponse || !pngResponse.content) {
                throw new Error('No PNG data received from webview');
            }

            const pngDataUrl = pngResponse.content;

            // Validate the data URL format
            if (!pngDataUrl.startsWith('data:image/png;base64,')) {
                console.error('Invalid PNG data URL format:', pngDataUrl.substring(0, 50) + '...');
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
            console.error('Error in PNG export:', error);
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
            console.log('JPG export: Got SVG content, length:', svgContent.length);

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

            console.log('JPG export: Received response');

            if (!jpgResponse || !jpgResponse.content) {
                throw new Error('No JPG data received from webview');
            }

            const jpgDataUrl = jpgResponse.content;

            // Validate the data URL format
            if (!jpgDataUrl.startsWith('data:image/jpeg;base64,')) {
                console.error('Invalid JPG data URL format:', jpgDataUrl.substring(0, 50) + '...');
                throw new Error('Invalid JPG data URL format');
            }

            const jpgBase64 = jpgDataUrl.replace(/^data:image\/jpeg;base64,/, '');
            const jpgBinary = Buffer.from(jpgBase64, 'base64');

            await vscode.workspace.fs.writeFile(jpgUri, jpgBinary);
            vscode.window.showInformationMessage('JPG diagram saved successfully!');
            panel.webview.postMessage({
                command: 'saveResult',
                success: true,
                type: 'jpg',
                path: jpgUri.fsPath
            });
        } catch (error: any) {
            console.error('Error in JPG export:', error);
            vscode.window.showErrorMessage(`Failed to export JPG: ${error.message}`);
            throw error;
        }
    }
} 