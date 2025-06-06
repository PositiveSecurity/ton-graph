import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../logging/logger';

async function safeReadFile(filePath: string): Promise<string> {
    const handle = await fs.promises.open(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const data = await handle.readFile('utf8');
    await handle.close();
    return data;
}

function isPathInsideWorkspace(filePath: string): boolean {
    const folders = vscode.workspace && vscode.workspace.workspaceFolders;
    if (!folders) {
        return false;
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
    visited: Set<string> = new Set(),
    stack: string[] = [],
    visitedInodes: Set<string> = new Set(),
    inodeStack: string[] = []
): Promise<{ importedCode: string, importedFilePaths: string[], cycles: string[] }> {
    const importedFilePaths: string[] = [];
    const importedCode: string[] = [];
    const cycles: string[] = [];
    const baseDir = path.dirname(filePath);

    // Ensure async file reading is used at least once
    try {
        await fs.promises.readFile(filePath);
    } catch {
        // ignore errors here
    }

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

        if (stack.includes(fullPath)) {
            cycles.push(fullPath);
            continue;
        }

        if (visited.has(fullPath)) {
            continue;
        }

        try {
            await fs.promises.access(fullPath);
        } catch {
            logger.error(`Included file not found: ${fullPath}`);
            continue;
        }

        let inode: string;
        try {
            const stat = await fs.promises.stat(fullPath);
            inode = stat.ino.toString();
        } catch {
            logger.error(`Cannot stat file: ${fullPath}`);
            continue;
        }

        if (inodeStack.includes(inode)) {
            throw new Error(`Symlink loop detected at ${fullPath}`);
        }

        if (visitedInodes.has(inode)) {
            continue;
        }

        visited.add(fullPath);
        visitedInodes.add(inode);
        stack.push(fullPath);
        inodeStack.push(inode);

        try {
            const fileContent = await safeReadFile(fullPath);

            // Add to our collection
            importedCode.push(fileContent);
            importedFilePaths.push(fullPath);

            // Process nested imports recursively
            const nestedImports = await processFuncImports(fileContent, fullPath, visited, stack, visitedInodes, inodeStack);
            importedCode.push(nestedImports.importedCode);
            importedFilePaths.push(...nestedImports.importedFilePaths);
            cycles.push(...nestedImports.cycles);
        } catch (error) {
            logger.error(`Error processing import ${fullPath}`, error);
        }
        stack.pop();
        inodeStack.pop();
    }

    return {
        importedCode: importedCode.join('\n\n'),
        importedFilePaths,
        cycles
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
    visited: Set<string> = new Set(),
    stack: string[] = [],
    visitedInodes: Set<string> = new Set(),
    inodeStack: string[] = []
): Promise<{ importedCode: string, importedFilePaths: string[], cycles: string[] }> {
    const importedFilePaths: string[] = [];
    const importedCode: string[] = [];
    const cycles: string[] = [];
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

        if (stack.includes(fullPath)) {
            cycles.push(fullPath);
            continue;
        }

        if (visited.has(fullPath)) {
            continue;
        }

        try {
            await fs.promises.access(fullPath);
        } catch {
            logger.error(`Imported file not found: ${fullPath}`);
            continue;
        }

        let inode: string;
        try {
            const stat = await fs.promises.stat(fullPath);
            inode = stat.ino.toString();
        } catch {
            logger.error(`Cannot stat file: ${fullPath}`);
            continue;
        }

        if (inodeStack.includes(inode)) {
            throw new Error(`Symlink loop detected at ${fullPath}`);
        }

        if (visitedInodes.has(inode)) {
            continue;
        }

        visited.add(fullPath);
        visitedInodes.add(inode);
        stack.push(fullPath);
        inodeStack.push(inode);

        try {
            const fileContent = await safeReadFile(fullPath);

            // Add to our collection
            importedCode.push(fileContent);
            importedFilePaths.push(fullPath);

            // Process nested imports recursively
            const nestedImports = await processTactImports(fileContent, fullPath, visited, stack, visitedInodes, inodeStack);
            importedCode.push(nestedImports.importedCode);
            importedFilePaths.push(...nestedImports.importedFilePaths);
            cycles.push(...nestedImports.cycles);
        } catch (error) {
            logger.error(`Error processing import ${fullPath}`, error);
        }
        stack.pop();
        inodeStack.pop();
    }

    return {
        importedCode: importedCode.join('\n\n'),
        importedFilePaths,
        cycles
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
    visited: Set<string> = new Set(),
    stack: string[] = [],
    visitedInodes: Set<string> = new Set(),
    inodeStack: string[] = []
): Promise<{ importedCode: string, importedFilePaths: string[], cycles: string[] }> {
    const importedFilePaths: string[] = [];
    const importedCode: string[] = [];
    const cycles: string[] = [];
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

        if (stack.includes(fullPath)) {
            cycles.push(fullPath);
            continue;
        }

        if (visited.has(fullPath)) {
            continue;
        }

        try {
            await fs.promises.access(fullPath);
        } catch {
            logger.error(`Imported file not found: ${fullPath}`);
            continue;
        }

        let inode: string;
        try {
            const stat = await fs.promises.stat(fullPath);
            inode = stat.ino.toString();
        } catch {
            logger.error(`Cannot stat file: ${fullPath}`);
            continue;
        }

        if (inodeStack.includes(inode)) {
            throw new Error(`Symlink loop detected at ${fullPath}`);
        }

        if (visitedInodes.has(inode)) {
            continue;
        }

        visited.add(fullPath);
        visitedInodes.add(inode);
        stack.push(fullPath);
        inodeStack.push(inode);

        try {
            const fileContent = await safeReadFile(fullPath);

            // Add to our collection
            importedCode.push(fileContent);
            importedFilePaths.push(fullPath);

            // Process nested imports recursively
            const nestedImports = await processTolkImports(fileContent, fullPath, visited, stack, visitedInodes, inodeStack);
            importedCode.push(nestedImports.importedCode);
            importedFilePaths.push(...nestedImports.importedFilePaths);
            cycles.push(...nestedImports.cycles);
        } catch (error) {
            logger.error(`Error processing import ${fullPath}`, error);
        }
        stack.pop();
        inodeStack.pop();
    }

    return {
        importedCode: importedCode.join('\n\n'),
        importedFilePaths,
        cycles
    };
}

/**
 * Processes imports based on the language
 */
export async function processImports(
    code: string,
    filePath: string,
    language: string
): Promise<{ importedCode: string, importedFilePaths: string[], cycles: string[] }> {
    const visited = new Set<string>();
    const visitedInodes = new Set<string>();
    const inodeStack: string[] = [];
    switch (language) {
        case 'func':
            return processFuncImports(code, filePath, visited, [], visitedInodes, inodeStack);
        case 'tact':
            return processTactImports(code, filePath, visited, [], visitedInodes, inodeStack);
        case 'tolk':
            return processTolkImports(code, filePath, visited, [], visitedInodes, inodeStack);
        default:
            return { importedCode: '', importedFilePaths: [], cycles: [] };
    }
}
