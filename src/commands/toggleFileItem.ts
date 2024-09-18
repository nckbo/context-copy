// src/commands/toggleFileItem.ts
import * as vscode from 'vscode';
import { FileTreeProvider } from '../providers/FileTreeProvider';
import { FileItem } from '../models/FileItem';

/**
 * Registers the toggleFileItem command.
 * @param treeDataProvider The FileTreeProvider instance.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerToggleFileItemCommand(
    treeDataProvider: FileTreeProvider,
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.toggleFileItem',
        (item: FileItem) => {
            item.toggleChecked();
            // Refresh the tree view
            treeDataProvider.refresh(item);
        }
    );
}
