import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';
import { copyDependencyInfo } from '../utils/copyUtils';


export function registerCopyDependencyInfoCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'extension.copyDependencyInfo',
    async (item: DependencyItem) => {
      await copyDependencyInfo(item);
    }
  );
}
