// src/commands/buildFileDependencyTree.ts

import * as vscode from 'vscode';
import { FileDependencyTreeProvider } from '../providers/FileDependencyTreeProvider';
import { FileDependencyItem } from '../models/FileDependencyItem';
import { buildFileDependencyTree } from '../utils/fileDependencyUtils';

/**
 * Registers the command to build the file dependency tree.
 * @param treeDataProvider The FileDependencyTreeProvider instance.
 * @param context The vscode.ExtensionContext instance.
 */
export function registerBuildFileDependencyTreeCommand(
    treeDataProvider: FileDependencyTreeProvider, 
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand('extension.buildFileDependencyTree', async () => {
        await buildFileDependencyTree(treeDataProvider, context);
        vscode.commands.executeCommand('workbench.view.extension.contextCopy');
    });
}
