// src/utils/importUtils.ts
import * as vscode from 'vscode';
import { collectCheckedItems, groupItemsByFileAndClass } from './dependencyUtils';
import { DependencyItem } from '../models/DependencyItem';
import { extractSymbolNames, groupMapToDependencyItems } from './copyUtils';

/**
 * Retrieves all import declarations from a document.
 * @param uri The URI of the document.
 * @returns Array of ImportDeclaration symbols.
 */
export async function getImportDeclarations(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    uri
  );

  if (!symbols){
   return [];
  }  

  // Filter for ImportDeclaration symbols (SymbolKind.Module typically represents import statements)
  const importDeclarations = symbols.filter(symbol => symbol.kind === vscode.SymbolKind.Module);

  return importDeclarations;
}

/**
 * Maps symbol names to their corresponding import statements.
 * Handles named, default, and namespace imports.
 * @param importDeclarations Array of ImportDeclaration symbols.
 * @returns Map where key is symbol name and value is the import statement.
 */
export function mapSymbolsToImports(importDeclarations: vscode.DocumentSymbol[]): Map<string, string> {
  const symbolToImportMap = new Map<string, string>();

  importDeclarations.forEach(importDecl => {
    const modulePath = importDecl.name; // e.g., 'my_module'

    if (importDecl.children) {
      importDecl.children.forEach(child => {
        switch (child.kind) {
          case vscode.SymbolKind.Function:
          case vscode.SymbolKind.Class:
          case vscode.SymbolKind.Variable:
          case vscode.SymbolKind.Interface:
            // Handle named imports: import { myFunction } from 'my_module';
            symbolToImportMap.set(child.name, `import { ${child.name} } from '${modulePath}';`);
            break;

          case vscode.SymbolKind.Namespace:
            // Handle namespace imports: import * as MyModule from 'my_module';
            symbolToImportMap.set(child.name, `import * as ${child.name} from '${modulePath}';`);
            break;

          case vscode.SymbolKind.Object:
            // Handle default imports: import MyDefault from 'my_module';
            symbolToImportMap.set(child.name, `import ${child.name} from '${modulePath}';`);
            break;

          // Add more cases if needed
          default:
            break;
        }
      });
    }
  });

  return symbolToImportMap;
}


/**
 * Function to extract and print relevant import statements for the selected DependencyItem.
 */
export async function printRelevantImports(item: DependencyItem) {
  try {
    // Step 1: Collect all checked items starting from the selected item
    const checkedItems = collectCheckedItems(item);

    if (checkedItems.length === 0) {
      vscode.window.showWarningMessage('No checked dependency items to process.');
      return;
    }

    // Step 2: Group items by file and class
    const symbolsMap = new Map<string, vscode.DocumentSymbol[]>(); // To cache symbols per file
    const groupedMap = await groupItemsByFileAndClass(checkedItems, symbolsMap);

    if (groupedMap.size === 0) {
      vscode.window.showWarningMessage('No valid dependency items to process.');
      return;
    }

    // Step 3: Extract and Print Relevant Imports
    for (const [file, classMap] of groupedMap.entries()) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
      }

      const workspaceUri = workspaceFolders[0].uri;
      const absoluteUri = vscode.Uri.joinPath(workspaceUri, file);

      // Check if the file exists
      const fileExists = await Promise.resolve(vscode.workspace.fs.stat(absoluteUri))
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        vscode.window.showErrorMessage(`File does not exist: ${file}`);
        continue;
      }

      const importDecls = await getImportDeclarations(absoluteUri);
      const symbolToImportMap = mapSymbolsToImports(importDecls);

      // Collect all symbols being copied for this file
      const dependencyItemsForFile = groupMapToDependencyItems(groupedMap, file);
      const symbolNames = extractSymbolNames(dependencyItemsForFile);

      // Map symbols to their imports
      const relevantImports: string[] = [];
      symbolNames.forEach(symbol => {
        const importStmt = symbolToImportMap.get(symbol);
        if (importStmt) {
          relevantImports.push(importStmt);
        }
      });

      // Remove duplicate imports
      const uniqueImports = Array.from(new Set(relevantImports));

      // Print the imports to the Debug Console
      if (uniqueImports.length > 0) {
        console.log(`\nRelevant imports for file: ${file}`);
        uniqueImports.forEach(importStmt => console.log(importStmt));
      } else {
        console.log(`\nNo relevant imports found for file: ${file}`);
      }
    }

    // Show a confirmation message
    vscode.window.showInformationMessage('Printed relevant import statements to the Debug Console.');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to print relevant imports: ${error}`);
  }
}
