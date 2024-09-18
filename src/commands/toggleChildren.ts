import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';
import { DependencyTreeProvider } from '../providers/DependencyTreeProvider';

export function registerToggleChildrenCommand(
  treeDataProvider: DependencyTreeProvider,
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand('extension.toggleChildren', (item: DependencyItem) => {
    // Toggle only the children of the selected item
    item.toggleChildren();
    // Refresh the tree view to reflect the changes
    treeDataProvider.refresh(item);
  });
}
