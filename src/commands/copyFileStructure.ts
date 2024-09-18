// src/commands/copyFileStructure.ts
import * as vscode from 'vscode';
import { FileItem } from '../models/FileItem';

/**
 * Generates a tree-like string from a FileItem and its children.
 * @param item The FileItem to generate the tree string from.
 * @param prefix The prefix string for the current level.
 * @returns String representing the file structure.
 */
function generateFileTreeString(item: FileItem, prefix: string = ''): string {
    let treeStr = '';
    const connector = prefix === '' ? '' : (item === item.parent?.children[item.parent.children.length - 1] ? '└── ' : '├── ');
    treeStr += `${prefix}${connector}${item.label}\n`;
    if (item.children && item.children.length > 0) {
        const newPrefix = prefix + (connector.trim() === '└──' ? '    ' : '│   ');
        item.children.forEach((child, index) => {
            treeStr += generateFileTreeString(child, newPrefix);
        });
    }
    return treeStr;
}

/**
 * Copies the selected file structure to the clipboard.
 * @param item The selected FileItem.
 */
export async function copyFileStructure(item: FileItem): Promise<void> {
    if (!item) {
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
    }

    const tree = generateFileTreeString(item);

    try {
        await vscode.env.clipboard.writeText(tree);
        vscode.window.showInformationMessage('Selected file structure copied to clipboard.');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to copy file structure.');
        console.error(error);
    }
}

/**
 * Registers the copyFileStructure command.
 * @param context Extension context.
 * @returns Disposable for the command.
 */
export function registerCopyFileStructureCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.copyFileStructure',
        async (item: FileItem) => {
            await copyFileStructure(item);
        }
    );
}
