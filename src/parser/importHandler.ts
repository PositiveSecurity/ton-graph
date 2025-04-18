import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Processes import statements in FunC code (#include)
 * @param code The source code to process
 * @param filePath The file path of the source code
 * @returns Object with the code from imported files and all imported file paths
 */
export async function processFuncImports(
    code: string,
    filePath: string
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

        try {
            // Check if file exists
            if (fs.existsSync(fullPath)) {
                // Read the file
                const fileContent = fs.readFileSync(fullPath, 'utf8');

                // Add to our collection
                importedCode.push(fileContent);
                importedFilePaths.push(fullPath);

                // Process nested imports recursively
                const nestedImports = await processFuncImports(fileContent, fullPath);
                importedCode.push(nestedImports.importedCode);
                importedFilePaths.push(...nestedImports.importedFilePaths);
            } else {
                console.warn(`Included file not found: ${fullPath}`);
            }
        } catch (error) {
            console.error(`Error processing import ${fullPath}:`, error);
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
    filePath: string
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
                console.warn(`Package not found: ${packageName}`);
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

        try {
            // Check if file exists
            if (fs.existsSync(fullPath)) {
                // Read the file
                const fileContent = fs.readFileSync(fullPath, 'utf8');

                // Add to our collection
                importedCode.push(fileContent);
                importedFilePaths.push(fullPath);

                // Process nested imports recursively
                const nestedImports = await processTactImports(fileContent, fullPath);
                importedCode.push(nestedImports.importedCode);
                importedFilePaths.push(...nestedImports.importedFilePaths);
            } else {
                console.warn(`Imported file not found: ${fullPath}`);
            }
        } catch (error) {
            console.error(`Error processing import ${fullPath}:`, error);
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
    filePath: string
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
                console.warn(`Package not found: ${packageName}`);
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

        try {
            // Check if file exists
            if (fs.existsSync(fullPath)) {
                // Read the file
                const fileContent = fs.readFileSync(fullPath, 'utf8');

                // Add to our collection
                importedCode.push(fileContent);
                importedFilePaths.push(fullPath);

                // Process nested imports recursively
                const nestedImports = await processTolkImports(fileContent, fullPath);
                importedCode.push(nestedImports.importedCode);
                importedFilePaths.push(...nestedImports.importedFilePaths);
            } else {
                console.warn(`Imported file not found: ${fullPath}`);
            }
        } catch (error) {
            console.error(`Error processing import ${fullPath}:`, error);
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
    switch (language) {
        case 'func':
            return processFuncImports(code, filePath);
        case 'tact':
            return processTactImports(code, filePath);
        case 'tolk':
            return processTolkImports(code, filePath);
        default:
            return { importedCode: '', importedFilePaths: [] };
    }
} 