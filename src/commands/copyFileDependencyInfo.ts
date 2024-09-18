import * as vscode from 'vscode';
import * as path from 'path'; // Import the 'path' module
import * as fs from 'fs';     // Import the 'fs' module
import { FileDependencyItem } from '../models/FileDependencyItem';

/**
 * Recursively collects all checked FileDependencyItems starting from the given item.
 * @param item The starting FileDependencyItem.
 * @returns An array of checked FileDependencyItems.
 */
function collectCheckedDependencies(item: FileDependencyItem): FileDependencyItem[] {
    let checkedItems: FileDependencyItem[] = [];

    if (item.isChecked) {
        checkedItems.push(item);
        for (const child of item.children) {
            checkedItems = checkedItems.concat(collectCheckedDependencies(child));
        }
    }

    return checkedItems;
}

/**
 * Copies the concatenated contents of selected dependencies to the clipboard.
 * @param item The selected FileDependencyItem.
 */
export async function copyFileDependencyInfo(item: FileDependencyItem): Promise<void> {
    try {
        // Step 1: Collect all checked items starting from the selected item
        const checkedItems = collectCheckedDependencies(item);

        if (checkedItems.length === 0) {
            vscode.window.showWarningMessage('No checked dependency items to copy.');
            return;
        }

        // Step 2: Generate the concatenated string
        let finalText = '';

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace is open.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        for (const depItem of checkedItems) {
            const relativePath = path.relative(rootPath, depItem.uri.fsPath);
            finalText += `''' ${relativePath} '''\n`;
            try {
                const fileContent = fs.readFileSync(depItem.uri.fsPath, 'utf8');
                finalText += `${fileContent}\n\n`;
            } catch (readError) {
                vscode.window.showWarningMessage(`Failed to read file: ${relativePath}`);
                console.error(`Failed to read file ${relativePath}:`, readError);
            }
        }

        // Step 3: Copy the concatenated string to the clipboard
        await vscode.env.clipboard.writeText(finalText.trim());

        // Step 4: Show a confirmation message
        vscode.window.showInformationMessage('Copied selected file dependencies to clipboard.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy file dependencies: ${error}`);
        console.error(error);
    }
}

/**
 * Registers the copyFileDependencyInfo command.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerCopyFileDependencyInfoCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.copyFileDependencyInfo',
        async (item: FileDependencyItem) => {
            await copyFileDependencyInfo(item);
        }
    );
}
