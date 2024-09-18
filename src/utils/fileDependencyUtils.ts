// src/utils/fileDependencyUtils.ts

import * as vscode from 'vscode';
import { FileDependencyTreeProvider } from '../providers/FileDependencyTreeProvider';
import { FileDependencyItem } from '../models/FileDependencyItem';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

/**
 * Builds the file dependency tree based on the current file's imports.
 * Only runs for Python files.
 * @param treeDataProvider The FileDependencyTreeProvider instance.
 * @param context The vscode.ExtensionContext instance to resolve the extension path.
 */
export async function buildFileDependencyTree(
    treeDataProvider: FileDependencyTreeProvider,
    context: vscode.ExtensionContext
): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }

    const document = editor.document;
    const filePath = document.uri.fsPath;
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== '.py') {
        vscode.window.showInformationMessage('Build File Dependency Tree is only available for Python files.');
        return;
    }

    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage('The active file does not exist.');
        return;
    }

    // Initialize a set to keep track of visited files to prevent infinite loops
    const visitedFiles = new Set<string>();

    try {
        // Retrieve the Python interpreter path from configuration
        const pythonPath = getPythonInterpreterPath();
        if (!pythonPath) {
            vscode.window.showErrorMessage('Python interpreter path is not set. Please configure "contextCopy.pythonPath" in your settings.');
            return;
        }

        console.log(`Using Python interpreter: ${pythonPath}`);

        // Read the content of the current Python file
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Resolve the Python script path using context.asAbsolutePath
        const pythonScriptPath = context.asAbsolutePath(path.join('scripts', 'parse_imports.py'));

        // Log the resolved script path
        console.log(`Resolved Python script path: ${pythonScriptPath}`);

        // Ensure the Python script exists
        if (!fs.existsSync(pythonScriptPath)) {
            vscode.window.showErrorMessage(`Dependency parser script not found at: ${pythonScriptPath}`);
            console.error(`Script not found: ${pythonScriptPath}`);
            return;
        }

        // Execute the Python script with the file content as stdin
        const importsJson = await runPythonScript(pythonPath, pythonScriptPath, fileContent);

        // Log the raw imports JSON
        console.log(`Raw imports JSON: ${importsJson}`);

        // Parse the JSON output
        const imports: { [alias: string]: string } = JSON.parse(importsJson);

        // Log the parsed imports
        console.log(`Parsed imports:`, imports);

        // Filter imports to include only those within the workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace is open.');
            console.error('No workspace folders found.');
            return;
        }
        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        console.log(`Workspace root: ${workspaceRoot}`);

        const filteredImports: string[] = [];

        for (const [alias, depPath] of Object.entries(imports)) {
            console.log(`Processing import: ${alias} -> ${depPath}`);
            // Check if depPath is a valid absolute path
            if (path.isAbsolute(depPath)) {
                console.log(`Resolved dependency path: ${depPath}`);

                if (depPath.startsWith(workspaceRoot) && fs.existsSync(depPath)) {
                    filteredImports.push(depPath);
                    console.log(`Added dependency: ${depPath}`);
                } else {
                    console.log(`Excluded dependency: ${depPath}`);
                }
            } else {
                // If depPath is not absolute, resolve it relative to the workspace root
                const absoluteDepPath = path.resolve(workspaceRoot, depPath);
                console.log(`Resolved dependency path (relative): ${absoluteDepPath}`);

                if (absoluteDepPath.startsWith(workspaceRoot) && fs.existsSync(absoluteDepPath)) {
                    filteredImports.push(absoluteDepPath);
                    console.log(`Added dependency: ${absoluteDepPath}`);
                } else {
                    console.log(`Excluded dependency: ${absoluteDepPath}`);
                }
            }
        }

        // Log the filtered imports
        console.log(`Filtered imports within workspace:`, filteredImports);

        if (filteredImports.length === 0) {
            vscode.window.showWarningMessage('No dependencies found within the workspace.');
            console.warn('No dependencies were filtered into the workspace.');
            return;
        }

        // Build the dependency tree recursively starting from the current file
        const rootDependency = await getDependenciesRecursive(filePath, filteredImports, visitedFiles, workspaceRoot, pythonScriptPath, pythonPath);

        if (rootDependency) {
            // Set the root items in the tree data provider
            treeDataProvider.setRootItems([rootDependency]);

            // Switch to the Context Copy view in the activity bar
            await vscode.commands.executeCommand('workbench.view.extension.contextCopy');
        } else {
            vscode.window.showWarningMessage('No dependencies found for the current file.');
            console.warn('No root dependency was created.');
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to build dependency tree: ${error.message}`);
        console.error(`Error in buildFileDependencyTree:`, error);
    }
}

/**
 * Retrieves the Python interpreter path from the extension's configuration.
 * @returns The Python interpreter path as a string, or null if not set.
 */
function getPythonInterpreterPath(): string | null {
    const config = vscode.workspace.getConfiguration('contextCopy');
    const pythonPath = config.get<string>('pythonPath');

    if (!pythonPath) {
        console.error('Python interpreter path is not set in configuration.');
        return null;
    }

    // Optionally, verify that the specified Python path exists
    if (!fs.existsSync(pythonPath)) {
        console.error(`Specified Python interpreter not found at: ${pythonPath}`);
        return null;
    }

    return pythonPath;
}

/**
 * Executes the Python script with the given input and returns the stdout.
 * @param pythonPath The path to the Python interpreter.
 * @param scriptPath The absolute path to the Python script.
 * @param input The input to send to the Python script via stdin.
 * @returns The stdout from the Python script.
 */
async function runPythonScript(pythonPath: string, scriptPath: string, input: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(pythonPath, [scriptPath]);

        let stdout = '';
        let stderr = '';

        // Collect the script's output
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
            console.error(`Python process error: ${error.message}`);
            reject(new Error(`Python process error: ${error.message}`));
        });

        // Handle process exit
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                console.error(`Python process exited with code ${code}: ${stderr}`);
                reject(new Error(`Python process exited with code ${code}: ${stderr}`));
            }
        });

        // Send the file content to stdin
        pythonProcess.stdin.write(input);
        pythonProcess.stdin.end();  // Signal that we're done writing to stdin
    });
}

/**
 * Recursively builds dependencies for a given file based on its imports.
 * @param filePath The absolute path of the current file.
 * @param dependencies The list of dependency file paths.
 * @param visitedFiles A set of already visited files to prevent infinite recursion.
 * @param workspaceRoot The root path of the workspace.
 * @param pythonScriptPath The absolute path to the Python script.
 * @param pythonPath The path to the Python interpreter.
 * @returns The root FileDependencyItem.
 */
async function getDependenciesRecursive(
    filePath: string,
    dependencies: string[],
    visitedFiles: Set<string>,
    workspaceRoot: string,
    pythonScriptPath: string,
    pythonPath: string
): Promise<FileDependencyItem | null> {
    if (visitedFiles.has(filePath)) {
        console.log(`Already visited: ${filePath}, skipping to prevent infinite loop.`);
        return null; // Prevent infinite loops
    }
    visitedFiles.add(filePath);

    if (!fs.existsSync(filePath)) {
        vscode.window.showWarningMessage(`Dependency file does not exist: ${filePath}`);
        console.warn(`Dependency file does not exist: ${filePath}`);
        return null;
    }

    const fileName = path.basename(filePath);
    const isDirectory = fs.statSync(filePath).isDirectory();
    const item = new FileDependencyItem(
        fileName, // Display only the file name
        isDirectory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        vscode.Uri.file(filePath),
        null // Parent will be set by the caller
    );

    if (isDirectory) {
        // If the dependency is a directory, include its __init__.py or index.py if exists
        const initPy = path.join(filePath, '__init__.py');
        const indexPy = path.join(filePath, 'index.py');
        let initFilePath: string | null = null;

        if (fs.existsSync(initPy)) {
            initFilePath = initPy;
        } else if (fs.existsSync(indexPy)) {
            initFilePath = indexPy;
        }

        if (initFilePath) {
            const childDependency = await getDependenciesRecursive(initFilePath, [], visitedFiles, workspaceRoot, pythonScriptPath, pythonPath);
            if (childDependency) {
                childDependency.parent = item;
                item.children.push(childDependency);
            }
        }
    } else {
        // Parse dependencies from the current file
        const fileContent = fs.readFileSync(filePath, 'utf8');

        try {
            const importsJson = await runPythonScript(pythonPath, pythonScriptPath, fileContent);
            console.log(`Parsed imports from ${fileName}: ${importsJson}`);
            const imports: { [alias: string]: string } = JSON.parse(importsJson);

            // Iterate through dependencies
            for (const [alias, depPath] of Object.entries(imports)) {
                // Handle unresolved modules
                if (
                    depPath.startsWith('Module') ||
                    depPath.startsWith("Module '") ||
                    depPath.startsWith("could not be resolved") ||
                    depPath.startsWith("not found")
                ) {
                    console.log(`Skipping unresolved module: ${alias} -> ${depPath}`);
                    continue; // Skip unresolved modules
                }

                // depPath is now an absolute path
                const absoluteDepPath = depPath;
                console.log(`Resolving dependency: ${alias} -> ${absoluteDepPath}`);

                if (absoluteDepPath.startsWith(workspaceRoot) && fs.existsSync(absoluteDepPath)) {
                    console.log(`Adding dependency: ${absoluteDepPath}`);
                    const depItem = await getDependenciesRecursive(absoluteDepPath, [], visitedFiles, workspaceRoot, pythonScriptPath, pythonPath);
                    if (depItem) {
                        depItem.parent = item;
                        item.children.push(depItem);
                    }
                } else {
                    console.log(`Dependency outside workspace or does not exist: ${absoluteDepPath}`);
                }
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to parse imports in ${fileName}: ${error.message}`);
            console.error(`Error parsing imports in ${fileName}:`, error);
        }
    }

    return item;
}
