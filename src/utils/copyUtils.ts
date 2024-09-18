// src/utils/copyUtils.ts
import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';
import { findEnclosingSymbols } from './symbolUtils';

/**
 * Recursively collects all checked DependencyItems starting from the given item.
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
    if (!symbolsMap.has(relativeFilePath)) {
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );
      if (symbols) {
        symbolsMap.set(relativeFilePath, symbols);
      } else {
        vscode.window.showErrorMessage(`No symbols found in ${relativeFilePath}.`);
        continue;
      }
    }

    const symbols = symbolsMap.get(relativeFilePath)!;

    // Find all enclosing symbols
    const enclosingSymbols = findEnclosingSymbols(symbols, range);

    if (!enclosingSymbols || enclosingSymbols.length === 0) {
      vscode.window.showErrorMessage(`No enclosing symbol found for "${depItem.label}" in ${relativeFilePath}.`);
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

/**
 * Helper function to convert groupedMap back to DependencyItems for a specific file.
 * @param groupedMap The grouped map of files to classes to snippets.
 * @param file The file path.
 * @returns Array of DependencyItems for the specified file.
 */
export function groupMapToDependencyItems(
  groupedMap: Map<string, Map<string, { startLine: number; endLine: number; code: string }[]>>,
  file: string
): DependencyItem[] {
  const classMap = groupedMap.get(file);
  if (!classMap) {
    return [];
  }
  const dependencyItems: DependencyItem[] = [];

  classMap.forEach((snippets, classSignature) => {
    snippets.forEach(snippet => {
      const item = new DependencyItem(
        snippet.code.split('\n')[0], // Assuming the first line is the symbol's name
        vscode.TreeItemCollapsibleState.None,
        new vscode.Location(vscode.Uri.file(file), new vscode.Range(snippet.startLine - 1, 0, snippet.endLine - 1, 0))
      );
      dependencyItems.push(item);
    });
  });

  return dependencyItems;
}

/**
 * Extracts symbol names from DependencyItems.
 * @param items Array of DependencyItems.
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


/**
 * Function to copy dependency item details and its checked subitems to the clipboard.
 * The copied content is organized by file and by class to avoid repeating class signatures.
 */
export async function copyDependencyInfo(item: DependencyItem) {
  try {
    // Step 1: Collect all checked items starting from the selected item
    const checkedItems = collectCheckedItems(item);

    if (checkedItems.length === 0) {
      vscode.window.showWarningMessage('No checked dependency items to copy.');
      return;
    }

    // Step 2: Group items by file and class
    const symbolsMap = new Map<string, vscode.DocumentSymbol[]>(); // To cache symbols per file
    const groupedMap = await groupItemsByFileAndClass(checkedItems, symbolsMap);

    if (groupedMap.size === 0) {
      vscode.window.showWarningMessage('No valid dependency items to copy.');
      return;
    }

    // Step 3: Sort the snippets within each file by startLine
    for (const [file, classMap] of groupedMap.entries()) {
      for (const [classSignature, snippets] of classMap.entries()) {
        snippets.sort((a, b) => a.startLine - b.startLine);
      }
    }

    // Step 4: Format the final copied text
    let finalText = '';

    for (const [file, classMap] of groupedMap.entries()) {
      finalText += `''' ${file} '''\n`;
      for (const [classSignature, snippets] of classMap.entries()) {
        if (classSignature.startsWith('Standalone:')) {
          // Standalone function or class
          const snippet = snippets[0];
          finalText += `### lines ${snippet.startLine} - ${snippet.endLine}\n`;
          finalText += `${snippet.code}\n\n`;
        } else {
          // Class with methods
          finalText += `${classSignature}\n`;
          finalText += `    ...\n`;
          for (const snippet of snippets) {
            if (snippet.startLine === snippet.endLine) {
              finalText += `    ### line ${snippet.startLine}\n`;
            } else {
              finalText += `    ### lines ${snippet.startLine} - ${snippet.endLine}\n`;
            }
            finalText += `    ${snippet.code}\n\n`;
          }
        }
      }
    }

    // Step 5: Copy the formatted text to the clipboard
    await vscode.env.clipboard.writeText(finalText.trim());

    // Show a confirmation message
    vscode.window.showInformationMessage('Copied selected dependency items to clipboard.');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to copy dependency items: ${error}`);
  }
}



























// import * as vscode from 'vscode';
// import { DependencyItem } from '../models/DependencyItem';
// import { collectCheckedItems, groupItemsByFileAndClass } from './dependencyUtils';
// import { findEnclosingSymbols, extractSymbolNames } from './symbolUtils';
// import {extractRelevantImports, getImportDeclarations, mapSymbolsToImports, formatCopiedContent} from './importUtils';

// /**
//  * Function to copy dependency item details and its checked subitems to the clipboard.
//  * The copied content is organized by file and by class to avoid repeating class signatures.
//  * Additionally, relevant import statements are included.
//  */
// export async function copyDependencyInfo(item: DependencyItem) {
//   try {
//     // Step 1: Collect all checked items starting from the selected item
//     const checkedItems = collectCheckedItems(item);

//     if (checkedItems.length === 0) {
//       vscode.window.showWarningMessage('No checked dependency items to copy.');
//       return;
//     }

//     // Step 2: Group items by file and class
//     const symbolsMap = new Map<string, vscode.DocumentSymbol[]>(); // To cache symbols per file
//     const groupedMap = await groupItemsByFileAndClass(checkedItems, symbolsMap);

//     if (groupedMap.size === 0) {
//       vscode.window.showWarningMessage('No valid dependency items to copy.');
//       return;
//     }

//     // Step 3: Sort the snippets within each file by startLine
//     for (const [file, classMap] of groupedMap.entries()) {
//       for (const [classSignature, snippets] of classMap.entries()) {
//         snippets.sort((a, b) => a.startLine - b.startLine);
//       }
//     }

//     // Step 4: Extract relevant imports
//     const importStatements: string[] = [];
//     const codeSnippets: string[] = [];

//     for (const [file, classMap] of groupedMap.entries()) {
//       const uri = vscode.Uri.file(file);
//       const importDecls = await getImportDeclarations(uri);
//       const symbolToImportMap = mapSymbolsToImports(importDecls);

//       // Collect all symbols being copied
//       const dependencyItemsForFile = groupMapToDependencyItems(groupedMap, file);

//       // Iterate over each DependencyItem in the file
//       let allSymbolNames = new Set<string>();
//       dependencyItemsForFile.forEach(depItem => {
//         const symbolNames = extractSymbolNames(collectCheckedItems(depItem)); // Correctly handle each item
//         allSymbolNames = new Set([...allSymbolNames, ...symbolNames]);
//       });

//       const relevantImports = extractRelevantImports(allSymbolNames, symbolToImportMap);
//       importStatements.push(...relevantImports);

//       // Collect code snippets
//       for (const [classSignature, snippets] of classMap.entries()) {
//         if (classSignature.startsWith('Standalone:')) {
//           const snippet = snippets[0];
//           codeSnippets.push(`### lines ${snippet.startLine} - ${snippet.endLine}\n${snippet.code}`);
//         } else {
//           let classContent = `${classSignature}\n    ...\n`;
//           snippets.forEach(snippet => {
//             const lineInfo = snippet.startLine === snippet.endLine
//               ? `### line ${snippet.startLine}`
//               : `### lines ${snippet.startLine} - ${snippet.endLine}`;
//             classContent += `    ${lineInfo}\n    ${snippet.code}\n\n`;
//           });
//           codeSnippets.push(classContent.trim());
//         }
//       }
//     }

//     // Remove duplicate import statements
//     const uniqueImports = Array.from(new Set(importStatements));

//     // Step 5: Format the final copied text
//     const finalText = formatCopiedContent(uniqueImports, codeSnippets);

//     // Step 6: Copy the formatted text to the clipboard
//     await vscode.env.clipboard.writeText(finalText.trim());

//     // Show a confirmation message
//     vscode.window.showInformationMessage('Copied selected dependency items and relevant imports to clipboard.');
//   } catch (error) {
//     vscode.window.showErrorMessage(`Failed to copy dependency items: ${error}`);
//   }
// }


// /**
//  * Helper function to convert groupedMap back to DependencyItems for a specific file.
//  * @param groupedMap The grouped map of files to classes to snippets.
//  * @param file The file path.
//  * @returns Array of DependencyItems for the specified file.
//  */
// function groupMapToDependencyItems(groupedMap: Map<string, Map<string, { startLine: number; endLine: number; code: string }[]>>, file: string): DependencyItem[] {
//   const classMap = groupedMap.get(file);
//   if (!classMap) {
//     return [];
//   }

//   const dependencyItems: DependencyItem[] = [];

//   classMap.forEach((snippets, classSignature) => {
//     snippets.forEach(snippet => {
//       const item = new DependencyItem(
//         snippet.code.split('\n')[0], // Assuming the first line is the symbol's name
//         vscode.TreeItemCollapsibleState.None,
//         new vscode.Location(vscode.Uri.file(file), new vscode.Range(snippet.startLine - 1, 0, snippet.endLine - 1, 0))
//       );
//       dependencyItems.push(item);
//     });
//   });

//   return dependencyItems;
// }
