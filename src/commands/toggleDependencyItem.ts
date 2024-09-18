import * as vscode from 'vscode';
import { DependencyTreeProvider } from '../providers/DependencyTreeProvider';
import { DependencyItem } from '../models/DependencyItem';

export function registerToggleDependencyItemCommand(
  treeDataProvider: DependencyTreeProvider,
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'extension.toggleDependencyItem',
    (item: DependencyItem) => {
      item.toggleChecked();
      // Refresh the tree view
      treeDataProvider.refresh(item);
    }
  );
}
