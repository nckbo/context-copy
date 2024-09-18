import * as vscode from 'vscode';
import { DependencyTreeProvider } from '../providers/DependencyTreeProvider';
import { buildDependencyTree } from '../utils/dependencyUtils';

export function registerBuildDependencyTreeCommand(
  treeDataProvider: DependencyTreeProvider,
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand('extension.buildDependencyTree', async () => {
    // Build the dependency tree
    await buildDependencyTree(treeDataProvider);

    // Switch to the context copy window in the activity bar
    vscode.commands.executeCommand('workbench.view.extension.contextCopy');
  });
}
