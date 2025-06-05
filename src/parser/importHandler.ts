import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../logging/logger';

function isPathInsideWorkspace(filePath: string): boolean {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {
        return true;
    }

    // Resolve symlinks for the file path
    let resolvedPath: string;
    try {
        resolvedPath = fs.realpathSync(path.resolve(filePath));
    } catch {
        // If resolving fails, treat path as is
        resolvedPath = path.resolve(filePath);
    }

    return folders.some(folder => {
        let workspacePath: string;
        try {
            workspacePath = fs.realpathSync(folder.uri.fsPath);
        } catch {
            workspacePath = folder.uri.fsPath;
        }
        const relative = path.relative(workspacePath, resolvedPath);
        return !relative.startsWith('..') && !path.isAbsolute(relative);
    });
}

/**
 * Processes import statements in FunC code (#include)
 * @param code The source code to process
 * @param filePath The file path of the source code
 * @returns Object with the code from imported files and all imported file paths
 */
export async function processFuncImports(
    code: string,
    filePath: string,
    visited: Set<string> = new Set()
): Promise<{ importedCode: string, importedFilePaths: string[] }> {
    const importedFilePaths: string[] = [];
    const importedCode: string[] = [];
    const baseDir = path.dirname(filePath);

    // Regular expression to find #include directives
    const includeRegex = /#include\s+"([^"]+)"/g;
    let match;

    while ((match = includeRegex.exec(code)) !== null) {
        const includePath = match[1];
        const fullPath = path.resolve(baseDir, includePath);
        if (!isPathInsideWorkspace(fullPath)) {
            logger.error(`Import outside workspace: ${includePath}`);
            continue;
        }

        if (visited.has(fullPath)) {
            continue;
        }

        visited.add(fullPath);

        try {
            await fs.promises.access(fullPath);
        } catch {
            logger.error(`Included file not found: ${fullPath}`);
            continue;
        }

        try {
            const fileContent = await fs.promises.readFile(fullPath, 'utf8');

            // Add to our collection
            importedCode.push(fileContent);
            importedFilePaths.push(fullPath);

            // Process nested imports recursively
            const nestedImports = await processFuncImports(fileContent, fullPath, visited);
            importedCode.push(nestedImports.importedCode);
            importedFilePaths.push(...nestedImports.importedFilePaths);
        } catch (error) {
            logger.error(`Error processing import ${fullPath}`, error);
        }
    }

    return {
        importedCode: importedCode.join('\n\n'),
        importedFilePaths
    };
}

/**
 * Processes import statements in Tact code (import)
 * @param code The source code to process
 * @param filePath The file path of the source code
 * @returns Object with the code from imported files and all imported file paths
 */
export async function processTactImports(
    code: string,
    filePath: string,
    visited: Set<string> = new Set()
): Promise<{ importedCode: string, importedFilePaths: string[] }> {
    const importedFilePaths: string[] = [];
    const importedCode: string[] = [];
    const baseDir = path.dirname(filePath);

    // Regular expression to find import statements
    const importRegex = /import\s+"([^"]+)"/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
        const importPath = match[1];
        // Handle relative paths and package imports
        let fullPath = importPath;

        if (importPath.startsWith('@')) {
            // For package imports, we'd need to resolve them properly
            // This is a simplified approach
            const packageName = importPath.split('/')[0];
            const packagePath = path.join(baseDir, 'node_modules', packageName);

            if (fs.existsSync(packagePath)) {
                fullPath = packagePath;
                // Could further resolve subpaths here
            } else {
                logger.error(`Package not found: ${packageName}`);
                continue;
            }
        } else {
            // Relative import
            fullPath = path.resolve(baseDir, importPath);

            // Add .tact extension if missing
            if (!path.extname(fullPath)) {
                fullPath += '.tact';
            }
        }

        if (!isPathInsideWorkspace(fullPath)) {
            logger.error(`Import outside workspace: ${importPath}`);
            continue;
        }

        if (visited.has(fullPath)) {
            continue;
        }

        visited.add(fullPath);

        try {
            await fs.promises.access(fullPath);
        } catch {
            logger.error(`Imported file not found: ${fullPath}`);
            continue;
        }

        try {
            const fileContent = await fs.promises.readFile(fullPath, 'utf8');

            // Add to our collection
            importedCode.push(fileContent);
            importedFilePaths.push(fullPath);

            // Process nested imports recursively
            const nestedImports = await processTactImports(fileContent, fullPath, visited);
            importedCode.push(nestedImports.importedCode);
            importedFilePaths.push(...nestedImports.importedFilePaths);
        } catch (error) {
            logger.error(`Error processing import ${fullPath}`, error);
        }
    }

    return {
        importedCode: importedCode.join('\n\n'),
        importedFilePaths
    };
}

/**
 * Processes import statements in Tolk code (import)
 * @param code The source code to process
 * @param filePath The file path of the source code
 * @returns Object with the code from imported files and all imported file paths
 */
export async function processTolkImports(
    code: string,
    filePath: string,
    visited: Set<string> = new Set()
): Promise<{ importedCode: string, importedFilePaths: string[] }> {
    const importedFilePaths: string[] = [];
    const importedCode: string[] = [];
    const baseDir = path.dirname(filePath);

    // Regular expression to find import statements
    const importRegex = /import\s+"([^"]+)"/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
        const importPath = match[1];
        // Handle relative paths and package imports
        let fullPath = importPath;

        if (importPath.startsWith('@')) {
            // For package imports, we'd need to resolve them properly
            // This is a simplified approach
            const packageName = importPath.split('/')[0];
            const packagePath = path.join(baseDir, 'node_modules', packageName);

            if (fs.existsSync(packagePath)) {
                fullPath = packagePath;
                // Could further resolve subpaths here
            } else {
                logger.error(`Package not found: ${packageName}`);
                continue;
            }
        } else {
            // Relative import
            fullPath = path.resolve(baseDir, importPath);

            // Add .tolk extension if missing
            if (!path.extname(fullPath)) {
                fullPath += '.tolk';
            }
        }

        if (!isPathInsideWorkspace(fullPath)) {
            logger.error(`Import outside workspace: ${importPath}`);
            continue;
        }

        if (visited.has(fullPath)) {
            continue;
        }

        visited.add(fullPath);

        try {
            await fs.promises.access(fullPath);
        } catch {
            logger.error(`Imported file not found: ${fullPath}`);
            continue;
        }

        try {
            const fileContent = await fs.promises.readFile(fullPath, 'utf8');

            // Add to our collection
            importedCode.push(fileContent);
            importedFilePaths.push(fullPath);

            // Process nested imports recursively
            const nestedImports = await processTolkImports(fileContent, fullPath, visited);
            importedCode.push(nestedImports.importedCode);
            importedFilePaths.push(...nestedImports.importedFilePaths);
        } catch (error) {
            logger.error(`Error processing import ${fullPath}`, error);
        }
    }

    return {
        importedCode: importedCode.join('\n\n'),
        importedFilePaths
    };
}

/**
 * Processes imports based on the language
 */
export async function processImports(
    code: string,
    filePath: string,
    language: string
): Promise<{ importedCode: string, importedFilePaths: string[] }> {
    const visited = new Set<string>();
    switch (language) {
        case 'func':
            return processFuncImports(code, filePath, visited);
        case 'tact':
            return processTactImports(code, filePath, visited);
        case 'tolk':
            return processTolkImports(code, filePath, visited);
        default:
            return { importedCode: '', importedFilePaths: [] };
    }
}
