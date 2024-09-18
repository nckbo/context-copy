// src/commands/toggleFileDependencyChildren.ts
import * as vscode from 'vscode';
import { FileDependencyTreeProvider } from '../providers/FileDependencyTreeProvider';
import { FileDependencyItem } from '../models/FileDependencyItem';

/**
 * Registers the toggleFileDependencyChildren command.
 * @param treeDataProvider The FileDependencyTreeProvider instance.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerToggleFileDependencyChildrenCommand(
    treeDataProvider: FileDependencyTreeProvider,
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.toggleFileDependencyChildren',
        (item: FileDependencyItem) => {
            item.toggleChildren();
            // Refresh the tree view
            treeDataProvider.refresh(item);
        }
    );
}
