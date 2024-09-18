import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';

/**
 * Helper function to find all enclosing DocumentSymbols for a given range
 */
export function findEnclosingSymbols(
  symbols: vscode.DocumentSymbol[],
  range: vscode.Range,
  ancestors: vscode.DocumentSymbol[] = []
): vscode.DocumentSymbol[] | undefined {
  for (const symbol of symbols) {
    if (symbol.range.contains(range)) {
      const newAncestors = [...ancestors, symbol];
      const childAncestors = findEnclosingSymbols(symbol.children, range, newAncestors);
      if (childAncestors && childAncestors.length > 0) {
        return childAncestors;
      }
      return newAncestors;
    }
  }
  return undefined;
}

/**
 * Helper function to check if a URI is within the workspace
 */
export function isUriInWorkspace(uri: vscode.Uri): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return false;
  }
  for (const folder of workspaceFolders) {
    if (uri.fsPath.startsWith(folder.uri.fsPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts symbol names from DependencyItems.
 * @param items Array of checked DependencyItems.
 * @returns Set of symbol names to be copied.
 */
export function extractSymbolNames(items: DependencyItem[]): Set<string> {
  const symbolNames = new Set<string>();
  items.forEach(item => {
    symbolNames.add(item.label);
    // If DependencyItem has more properties related to the symbol's name, extract accordingly
  });
  return symbolNames;
}

