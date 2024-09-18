// src/utils/dependencyParser.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Parses dependencies from a given file using VSCode's Symbol API.
 * @param document The TextDocument to parse.
 * @param rootPath The root path of the workspace.
 * @returns An array of absolute paths to dependent files.
 */
export async function parseDependencies(document: vscode.TextDocument, rootPath: string): Promise<string[]> {
    const ext = path.extname(document.fileName);
    let dependencies: string[] = [];

    if (ext === '.ts') {
        dependencies = await parseTypeScriptDependencies(document);
    } else if (ext === '.py') {
        dependencies = await parsePythonDependencies(document);
    }

    // Resolve paths to absolute file paths
    dependencies = dependencies
        .map(dep => resolveModulePath(dep, document.fileName, rootPath))
        .filter(dep => dep !== null) as string[];

    return dependencies;
}

/**
 * Parses TypeScript import statements to extract dependencies using Symbol API.
 * @param document The TypeScript TextDocument.
 * @returns An array of module paths.
 */
async function parseTypeScriptDependencies(document: vscode.TextDocument): Promise<string[]> {
    const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
    );

    if (!symbols) {
        return [];
    }

    const dependencies: string[] = [];

    for (const symbol of symbols) {
        if (symbol.kind === vscode.SymbolKind.Namespace || symbol.kind === vscode.SymbolKind.Module) {
            // Potential import statement
            const importPath = extractImportPathFromSymbol(symbol);
            if (importPath && isLocalModule(importPath)) {
                dependencies.push(importPath);
            }
        }
    }

    return dependencies;
}

/**
 * Parses Python import statements to extract dependencies using Symbol API.
 * @param document The Python TextDocument.
 * @returns An array of module paths.
 */
async function parsePythonDependencies(document: vscode.TextDocument): Promise<string[]> {
    const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
    );

    if (!symbols) {
        return [];
    }

    const dependencies: string[] = [];

    for (const symbol of symbols) {
        if (symbol.kind === vscode.SymbolKind.Namespace || symbol.kind === vscode.SymbolKind.Module) {
            // Potential import statement
            const importPath = extractImportPathFromSymbol(symbol);
            if (importPath && isLocalModule(importPath)) {
                // Convert Python module notation to path notation
                const modulePath = importPath.replace(/\./g, '/');
                dependencies.push(modulePath);
            }
        }
    }

    return dependencies;
}

/**
 * Extracts the import path from a SymbolInformation object.
 * This function assumes that the symbol's name corresponds to an import statement.
 * @param symbol The SymbolInformation object.
 * @returns The module path string if found, otherwise null.
 */
function extractImportPathFromSymbol(symbol: vscode.SymbolInformation): string | null {
    // Attempt to extract import path from the symbol's name or detail
    // This might need adjustment based on how symbols are provided by the language server

    // Example for TypeScript: symbol.name could be the module name
    // Example for Python: symbol.name could be the module name or the imported entity

    // Here, we assume that symbol.name represents the module path
    // This might not always be accurate and may require more sophisticated parsing
    return symbol.name;
}

/**
 * Determines if a module path is local (relative) or external.
 * @param modulePath The module path to check.
 * @returns True if local, false otherwise.
 */
function isLocalModule(modulePath: string): boolean {
    return modulePath.startsWith('.') || modulePath.startsWith('/');
}

/**
 * Resolves a module path to an absolute file path.
 * @param modulePath The module path from the import statement.
 * @param currentFilePath The absolute path of the current file.
 * @param rootPath The root path of the workspace.
 * @returns The absolute path to the dependent file, or null if not found.
 */
function resolveModulePath(modulePath: string, currentFilePath: string, rootPath: string): string | null {
    let resolvedPath: string;

    if (modulePath.startsWith('.')) {
        // Relative path
        resolvedPath = path.resolve(path.dirname(currentFilePath), modulePath);
    } else if (modulePath.startsWith('/')) {
        // Absolute path
        resolvedPath = path.resolve(rootPath, '.' + modulePath); // Ensure it's within workspace
    } else {
        // Non-relative import; treat as a local module inside the workspace
        resolvedPath = path.resolve(rootPath, modulePath.replace(/\./g, '/')); // Convert dot notation to folder structure
    }

    // Possible extensions
    const extensions = ['.ts', '.py', '/index.ts', '/index.py'];

    for (const ext of extensions) {
        const fullPath = resolvedPath.endsWith(ext) ? resolvedPath : resolvedPath + ext;
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            return fullPath;
        }
    }

    // If resolvedPath is a directory, look for index files
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        for (const ext of ['.ts', '.py']) {
            const indexPath = path.join(resolvedPath, `index${ext}`);
            if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
                return indexPath;
            }
        }
    }

    // Dependency not found
    return null;
}
