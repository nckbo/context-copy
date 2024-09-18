// src/commands/printRelevantImports.ts
import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';
import { printRelevantImports } from '../utils/importUtils'; // Implemented next

/**
 * Registers the 'printRelevantImports' command.
 * @param context The extension context.
 * @returns The disposable command.
 */
export function registerPrintRelevantImportsCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'extension.printRelevantImports',
    async (item: DependencyItem) => {
      await printRelevantImports(item);
    }
  );
}



