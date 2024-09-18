// src/commands/showFileDependencyTreeView.ts
import * as vscode from 'vscode';

/**
 * Command to show the File Dependency Tree view.
 */
export async function showFileDependencyTreeView() {
    // The ID of the view container (as defined in package.json)
    const viewContainerId = 'contextCopy';

    // The internal command to reveal the view container
    const revealCommand = `workbench.view.extension.${viewContainerId}`;

    // Execute the command to reveal the view container
    await vscode.commands.executeCommand(revealCommand);

    // Optionally, focus the File Dependency Tree view
    const fileDependencyViewId = 'fileDependencyTreeView';
    await vscode.commands.executeCommand('workbench.view.extension.contextCopy');
    await vscode.commands.executeCommand('vscode.focusView', fileDependencyViewId);
}

/**
 * Registers the showFileDependencyTreeView command.
 * @param context The extension context.
 * @returns A Disposable representing the command.
 */
export function registerShowFileDependencyTreeViewCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand(
        'extension.showFileDependencyTreeView',
        showFileDependencyTreeView
    );
}
