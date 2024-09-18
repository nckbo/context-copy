// src/commands/toggleFileDependencyItem.ts
import * as vscode from 'vscode';
import { FileDependencyTreeProvider } from '../providers/FileDependencyTreeProvider';
import { FileDependencyItem } from '../models/FileDependencyItem';

/**
 * Registers the toggleFileDependencyItem command.
 * @param treeDataProvider The FileDependencyTreeProvider instance.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerToggleFileDependencyItemCommand(
    treeDataProvider: FileDependencyTreeProvider,
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.toggleFileDependencyItem',
        (item: FileDependencyItem) => {
            item.toggleChecked();
            // Refresh the tree view
            treeDataProvider.refresh(item);
        }
    );
}
