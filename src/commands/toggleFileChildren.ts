// src/commands/toggleFileChildren.ts
import * as vscode from 'vscode';
import { FileTreeProvider } from '../providers/FileTreeProvider';
import { FileItem } from '../models/FileItem';

/**
 * Registers the toggleFileChildren command.
 * @param treeDataProvider The FileTreeProvider instance.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerToggleFileChildrenCommand(
    treeDataProvider: FileTreeProvider,
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.toggleFileChildren',
        (item: FileItem) => {
            item.toggleChildren();
            // Refresh the tree view
            treeDataProvider.refresh(item);
        }
    );
}
