// src/commands/copyWorkspaceStructure.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Recursively traverses a directory and builds a tree-like string representation.
 * @param dir The directory to traverse.
 * @param prefix The prefix string for the current level.
 * @returns A string representing the directory tree.
 */
function traverseDirectory(dir: string, prefix: string = ''): string {
  let treeStr = '';
  const items = fs.readdirSync(dir, { withFileTypes: true });

  // Filter out directories that start with ., __, or any other patterns
  const filteredItems = items.filter(item => {
    return !item.name.startsWith('.') && !item.name.startsWith('__') && !item.name.startsWith('node_modules');
  });

  // Sort directories first, then files
  filteredItems.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) {
      return -1;
    }
    if (!a.isDirectory() && b.isDirectory()) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  filteredItems.forEach((item, index) => {
    const isLast = index === filteredItems.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    treeStr += `${prefix}${connector}${item.name}\n`;

    if (item.isDirectory()) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      treeStr += traverseDirectory(path.join(dir, item.name), newPrefix);
    }
  });

  return treeStr;
}
/**
 * Copies the workspace directory structure to the clipboard.
 */
export async function copyWorkspaceStructure(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace is open.');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const tree = traverseDirectory(rootPath);

  try {
    await vscode.env.clipboard.writeText(tree);
    vscode.window.showInformationMessage('Workspace structure copied to clipboard.');
  } catch (error) {
    vscode.window.showErrorMessage('Failed to copy workspace structure.');
    console.error(error);
  }
}

// src/commands/copyWorkspaceStructure.ts (continued)
export function registerCopyWorkspaceStructureCommand(
    context: vscode.ExtensionContext
  ): vscode.Disposable {
    return vscode.commands.registerCommand(
      'extension.copyWorkspaceStructure',
      async () => {
        await copyWorkspaceStructure();
      }
    );
  }
  