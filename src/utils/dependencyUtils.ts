import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';
import { findEnclosingSymbols, isUriInWorkspace } from './symbolUtils';
import { DependencyTreeProvider } from '../providers/DependencyTreeProvider';

const path = require('path');

/**
 * Function to build the dependency tree
 */
export async function buildDependencyTree(treeDataProvider: DependencyTreeProvider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const position = editor.selection.active;
  const document = editor.document;

  // Prepare Call Hierarchy for the symbol at the cursor position
  const callHierarchyItems = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
    'vscode.prepareCallHierarchy',
    document.uri,
    position
  );

  if (!callHierarchyItems || callHierarchyItems.length === 0) {
    vscode.window.showErrorMessage('Call hierarchy not found for the selected symbol.');
    return;
  }

  // For simplicity, take the first CallHierarchyItem
  const rootCallHierarchyItem = callHierarchyItems[0];

  // Build the dependency tree recursively
  const visitedSymbols = new Set<string>();
  const rootDependency = await getDependenciesRecursive(
    rootCallHierarchyItem,
    visitedSymbols
  );

  // Set the root items in the tree data provider
  treeDataProvider.setRootItems([rootDependency]);
}

/**
 * Recursive function to get dependencies using Call Hierarchy API
 */
async function getDependenciesRecursive(
  callHierarchyItem: vscode.CallHierarchyItem,
  visitedSymbols: Set<string>,
  parent: DependencyItem | null = null
): Promise<DependencyItem> {
  const symbolKey = `${callHierarchyItem.uri.toString()}:${callHierarchyItem.range.start.line}:${callHierarchyItem.range.start.character}`;

  if (visitedSymbols.has(symbolKey)) {
    // Avoid infinite recursion in case of circular dependencies
    return new DependencyItem(
      `${callHierarchyItem.name} (already visited)`,
      vscode.TreeItemCollapsibleState.None,
      new vscode.Location(callHierarchyItem.uri, callHierarchyItem.range),
      parent
    );
  }

  visitedSymbols.add(symbolKey);

  // Create the DependencyItem for the current symbol
  const dependencyItem = new DependencyItem(
    callHierarchyItem.name,
    vscode.TreeItemCollapsibleState.Expanded,
    new vscode.Location(callHierarchyItem.uri, callHierarchyItem.range),
    parent
  );

  // Get outgoing calls
  const outgoingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
    'vscode.provideOutgoingCalls',
    callHierarchyItem
  );

  if (outgoingCalls && outgoingCalls.length > 0) {
    for (const outgoingCall of outgoingCalls) {
      const calledItem = outgoingCall.to; // Correct property access

      // Check if the called symbol is user-defined (i.e., within the workspace)
      if (isUriInWorkspace(calledItem.uri)) {
        // Recursively get dependencies for the called symbol
        const childDependency = await getDependenciesRecursive(
          calledItem,
          visitedSymbols,
          dependencyItem
        );
        dependencyItem.children.push(childDependency);
      }
    }

    // Update the collapsible state based on whether there are child dependencies
    dependencyItem.collapsibleState =
      dependencyItem.children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None;
  } else {
    // No outgoing calls
    dependencyItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
  }

  return dependencyItem;
}


/**
 * Recursively collects all checked DependencyItems starting from the given item.
 * @param item The root DependencyItem to start collecting from.
 * @returns An array of checked DependencyItems.
 */
export function collectCheckedItems(item: DependencyItem): DependencyItem[] {
  let items: DependencyItem[] = [];

  if (item.isChecked) {
    items.push(item);
    for (const child of item.children) {
      items = items.concat(collectCheckedItems(child));
    }
  }

  return items;
}

/**
 * Groups DependencyItems by their file paths and enclosing classes.
 * This prevents repeating class signatures when multiple methods from the same class are copied.
 * @param items An array of checked DependencyItems.
 * @param symbolsMap A map storing DocumentSymbols for each file to avoid redundant symbol retrieval.
 * @returns A map where each key is a file path and the value is another map of class signatures to their methods.
 */
export async function groupItemsByFileAndClass(
  items: DependencyItem[],
  symbolsMap: Map<string, vscode.DocumentSymbol[]>
): Promise<Map<string, Map<string, { startLine: number; endLine: number; code: string }[]>>> {
  const groupedMap = new Map<string, Map<string, { startLine: number; endLine: number; code: string }[]>>();

  for (const depItem of items) {
    const uri = depItem.location.uri;
    const range = depItem.location.range;

    // Get relative file path
    const relativeFilePath = vscode.workspace.asRelativePath(uri, false);

    // Fetch DocumentSymbols if not already fetched
    if (!symbolsMap.has(uri.fsPath)) {
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );
      if (symbols) {
        symbolsMap.set(uri.fsPath, symbols);
      } else {
        vscode.window.showErrorMessage(`No symbols found in ${uri.fsPath}.`);
        continue;
      }
    }

    const symbols = symbolsMap.get(uri.fsPath)!;

    // Find all enclosing symbols
    const enclosingSymbols = findEnclosingSymbols(symbols, range);

    if (!enclosingSymbols || enclosingSymbols.length === 0) {
      vscode.window.showErrorMessage(`No enclosing symbol found for "${depItem.label}" in ${uri.fsPath}.`);
      continue;
    }

    const innermostSymbol = enclosingSymbols[enclosingSymbols.length - 1];

    let classSignature: string | null = null;
    let formattedSnippet: string;
    let startLine: number;
    let endLine: number;

    // Determine if the innermost symbol is a method within a class
    if (enclosingSymbols.length >= 2) {
      const parentSymbol = enclosingSymbols[enclosingSymbols.length - 2];
      const childSymbol = innermostSymbol;

      if (
        (parentSymbol.kind === vscode.SymbolKind.Class || parentSymbol.kind === vscode.SymbolKind.Interface) &&
        (childSymbol.kind === vscode.SymbolKind.Method || childSymbol.kind === vscode.SymbolKind.Function)
      ) {
        // Get class signature
        const classStartLine = parentSymbol.range.start.line;
        const classLineText = await vscode.workspace.openTextDocument(uri).then(doc => doc.lineAt(classStartLine).text);

        // Get method code
        const methodCode = await vscode.workspace.openTextDocument(uri).then(doc => doc.getText(childSymbol.range));

        // Calculate lines
        startLine = childSymbol.range.start.line + 1; // Start from method start
        endLine = childSymbol.range.end.line + 1;

        // Combine class signature and method code with indentation
        classSignature = classLineText;
        formattedSnippet = `${methodCode}`; // No need for '### lines x - y' here
      } else {
        // Not a method within a class
        startLine = innermostSymbol.range.start.line + 1;
        endLine = innermostSymbol.range.end.line + 1;
        const symbolCode = await vscode.workspace.openTextDocument(uri).then(doc => doc.getText(innermostSymbol.range));
        formattedSnippet = symbolCode;
      }
    } else {
      // Only one enclosing symbol (e.g., top-level function or class)
      startLine = innermostSymbol.range.start.line + 1;
      endLine = innermostSymbol.range.end.line + 1;
      const symbolCode = await vscode.workspace.openTextDocument(uri).then(doc => doc.getText(innermostSymbol.range));
      formattedSnippet = symbolCode;
    }

    // Initialize maps if not present
    if (!groupedMap.has(relativeFilePath)) {
      groupedMap.set(relativeFilePath, new Map<string, { startLine: number; endLine: number; code: string }[]>());
    }

    const classMap = groupedMap.get(relativeFilePath)!;

    if (classSignature) {
      // If the class signature is not yet added, add it
      if (!classMap.has(classSignature)) {
        classMap.set(classSignature, []);
      }
      // Add the method to the class's method list
      classMap.get(classSignature)!.push({
        startLine,  // Use the method's own start line
        endLine,    // Use the method's own end line
        code: formattedSnippet,
      });
    } else {
      // Standalone function or class
      const standaloneKey = `Standalone:${depItem.label}`;
      if (!classMap.has(standaloneKey)) {
        classMap.set(standaloneKey, []);
      }
      classMap.get(standaloneKey)!.push({
        startLine,
        endLine,
        code: formattedSnippet,
      });
    }
  }

  return groupedMap;
}
