// src/commands/copySelectedFiles.ts
import * as vscode from 'vscode';
import { FileItem } from '../models/FileItem';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Recursively collects all checked FileItems starting from the given item.
 * @param item The starting FileItem.
 * @returns An array of checked FileItems.
 */
function collectCheckedFiles(item: FileItem): FileItem[] {
    let checkedFiles: FileItem[] = [];

    if (item.isChecked) {
        if (item.collapsibleState === vscode.TreeItemCollapsibleState.None) {
            // It's a file
            checkedFiles.push(item);
        } else {
            // It's a directory, collect checked files within
            for (const child of item.children) {
                checkedFiles = checkedFiles.concat(collectCheckedFiles(child));
            }
        }
    }

    return checkedFiles;
}

/**
 * Copies the concatenated contents of selected files to the clipboard.
 * @param item The selected FileItem.
 */
export async function copySelectedFilesContent(item: FileItem): Promise<void> {
    try {
        // Step 1: Collect all checked files starting from the selected item
        const checkedFiles = collectCheckedFiles(item);

        if (checkedFiles.length === 0) {
            vscode.window.showWarningMessage('No checked files to copy.');
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

        for (const fileItem of checkedFiles) {
            const relativePath = path.relative(rootPath, fileItem.uri.fsPath);
            finalText += `''' ${relativePath} '''\n`;

            try {
                const fileContent = fs.readFileSync(fileItem.uri.fsPath, 'utf8');
                finalText += `${fileContent}\n\n`;
            } catch (readError) {
                vscode.window.showWarningMessage(`Failed to read file: ${relativePath}`);
                console.error(`Failed to read file ${relativePath}:`, readError);
            }
        }

        // Step 3: Copy the concatenated string to the clipboard
        await vscode.env.clipboard.writeText(finalText.trim());

        // Step 4: Show a confirmation message
        vscode.window.showInformationMessage('Copied selected files to clipboard.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy selected files: ${error}`);
        console.error(error);
    }
}

/**
 * Registers the copySelectedFilesContent command.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerCopySelectedFilesCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.copySelectedFiles',
        async (item: FileItem) => {
            await copySelectedFilesContent(item);
        }
    );
}
