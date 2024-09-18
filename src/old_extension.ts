// import * as vscode from 'vscode';
// import * as path from 'path';

// export function activate(context: vscode.ExtensionContext) {
//   const treeDataProvider = new DependencyTreeProvider();

//   // Register the tree data provider
//   vscode.window.registerTreeDataProvider('dependencyTreeView', treeDataProvider);

//   // Register the 'Build Dependency Tree' command
//   let buildCommand = vscode.commands.registerCommand('extension.buildDependencyTree', () => {
//     buildDependencyTree(treeDataProvider);
//   });

//   // Register the command to toggle the checked state
//   let toggleCommand = vscode.commands.registerCommand(
//     'extension.toggleDependencyItem',
//     (item: DependencyItem) => {
//       item.toggleChecked();
//       // Refresh the tree view
//       treeDataProvider.refresh(item);
//     }
//   );

//   // Register the command to copy dependency item details
//   let copyCommand = vscode.commands.registerCommand(
//     'extension.copyDependencyInfo',
//     async (item: DependencyItem) => {
//       await copyDependencyInfo(item);
//     }
//   );

//   context.subscriptions.push(buildCommand);
//   context.subscriptions.push(toggleCommand);
//   context.subscriptions.push(copyCommand);
// }

// export function deactivate() {}

// // Class representing each item in the dependency tree
// class DependencyItem extends vscode.TreeItem {
//   public children: DependencyItem[] = [];
//   public isChecked: boolean = true;

//   constructor(
//     public readonly label: string,
//     public collapsibleState: vscode.TreeItemCollapsibleState,
//     public readonly location: vscode.Location,
//     public readonly parent: DependencyItem | null = null
//   ) {
//     super(label, collapsibleState);
//     // Assign a unique ID to each item
//     this.id = parent ? `${parent.id}/${label}` : label;

//     // Set the icon based on the checked state
//     this.iconPath = this.getIconPath();

//     // Set the context value for item-specific commands
//     this.contextValue = 'dependencyItem';

//     // Set the command to navigate to the symbol's definition
//     this.command = {
//       command: 'vscode.open',
//       title: 'Open Symbol',
//       arguments: [this.location.uri, { selection: this.location.range }],
//     };
//   }

//   // Toggle the checked state
//   toggleChecked(): void {
//     this.isChecked = !this.isChecked;
//     this.iconPath = this.getIconPath();
//     // Recursively update children
//     for (const child of this.children) {
//       child.setCheckedRecursively(this.isChecked);
//     }
//   }

//   // Set the checked state recursively
//   setCheckedRecursively(isChecked: boolean): void {
//     this.isChecked = isChecked;
//     this.iconPath = this.getIconPath();
//     for (const child of this.children) {
//       child.setCheckedRecursively(isChecked);
//     }
//   }

//   // Get the icon path based on the checked state
//   private getIconPath(): { light: string; dark: string } {
//     const iconName = this.isChecked ? 'checkbox-checked.png' : 'checkbox-unchecked.png';
//     return {
//       light: path.join(__filename, '..', '..', 'resources', 'light', iconName),
//       dark: path.join(__filename, '..', '..', 'resources', 'dark', iconName),
//     };
//   }
// }

// // Tree data provider for the dependency tree
// class DependencyTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
//   private _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined | void> =
//     new vscode.EventEmitter<DependencyItem | undefined | void>();
//   readonly onDidChangeTreeData: vscode.Event<DependencyItem | undefined | void> =
//     this._onDidChangeTreeData.event;

//   private rootItems: DependencyItem[] = [];

//   getTreeItem(element: DependencyItem): vscode.TreeItem {
//     return element;
//   }

//   getChildren(element?: DependencyItem): Thenable<DependencyItem[]> {
//     if (!element) {
//       // Return the root elements
//       return Promise.resolve(this.rootItems);
//     } else {
//       // Return the children of the given element
//       return Promise.resolve(element.children || []);
//     }
//   }

//   // Implement the getParent method
//   getParent(element: DependencyItem): vscode.ProviderResult<DependencyItem> {
//     return element.parent;
//   }

//   // Method to refresh the tree view
//   refresh(item?: DependencyItem): void {
//     this._onDidChangeTreeData.fire(item);
//   }

//   // Method to set the root items
//   setRootItems(items: DependencyItem[]): void {
//     this.rootItems = items;
//     this.refresh();
//   }
// }

// // Function to build the dependency tree
// async function buildDependencyTree(treeDataProvider: DependencyTreeProvider) {
//   const editor = vscode.window.activeTextEditor;
//   if (!editor) {
//     vscode.window.showErrorMessage('No active editor');
//     return;
//   }

//   const position = editor.selection.active;
//   const document = editor.document;

//   // Prepare Call Hierarchy for the symbol at the cursor position
//   const callHierarchyItems = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
//     'vscode.prepareCallHierarchy',
//     document.uri,
//     position
//   );

//   if (!callHierarchyItems || callHierarchyItems.length === 0) {
//     vscode.window.showErrorMessage('Call hierarchy not found for the selected symbol.');
//     return;
//   }

//   // For simplicity, take the first CallHierarchyItem
//   const rootCallHierarchyItem = callHierarchyItems[0];

//   // Build the dependency tree recursively
//   const visitedSymbols = new Set<string>();
//   const rootDependency = await getDependenciesRecursive(
//     rootCallHierarchyItem,
//     visitedSymbols
//   );

//   // Set the root items in the tree data provider
//   treeDataProvider.setRootItems([rootDependency]);
// }

// // Recursive function to get dependencies using Call Hierarchy API
// async function getDependenciesRecursive(
//   callHierarchyItem: vscode.CallHierarchyItem,
//   visitedSymbols: Set<string>,
//   parent: DependencyItem | null = null
// ): Promise<DependencyItem> {
//   const symbolKey = `${callHierarchyItem.uri.toString()}:${callHierarchyItem.range.start.line}:${callHierarchyItem.range.start.character}`;

//   if (visitedSymbols.has(symbolKey)) {
//     // Avoid infinite recursion in case of circular dependencies
//     return new DependencyItem(
//       `${callHierarchyItem.name} (already visited)`,
//       vscode.TreeItemCollapsibleState.None,
//       new vscode.Location(callHierarchyItem.uri, callHierarchyItem.range),
//       parent
//     );
//   }

//   visitedSymbols.add(symbolKey);

//   // Create the DependencyItem for the current symbol
//   const dependencyItem = new DependencyItem(
//     callHierarchyItem.name,
//     vscode.TreeItemCollapsibleState.Collapsed,
//     new vscode.Location(callHierarchyItem.uri, callHierarchyItem.range),
//     parent
//   );

//   // Get outgoing calls
//   const outgoingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
//     'vscode.provideOutgoingCalls',
//     callHierarchyItem
//   );

//   if (outgoingCalls && outgoingCalls.length > 0) {
//     for (const outgoingCall of outgoingCalls) {
//       const calledItem = outgoingCall.to; // Correct property access

//       // Check if the called symbol is user-defined (i.e., within the workspace)
//       if (isUriInWorkspace(calledItem.uri)) {
//         // Recursively get dependencies for the called symbol
//         const childDependency = await getDependenciesRecursive(
//           calledItem,
//           visitedSymbols,
//           dependencyItem
//         );
//         dependencyItem.children.push(childDependency);
//       }
//     }

//     // Update the collapsible state based on whether there are child dependencies
//     dependencyItem.collapsibleState =
//       dependencyItem.children.length > 0
//         ? vscode.TreeItemCollapsibleState.Collapsed
//         : vscode.TreeItemCollapsibleState.None;
//   } else {
//     // No outgoing calls
//     dependencyItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
//   }

//   return dependencyItem;
// }

// // Helper function to check if a URI is within the workspace
// function isUriInWorkspace(uri: vscode.Uri): boolean {
//   const workspaceFolders = vscode.workspace.workspaceFolders;
//   if (!workspaceFolders) {
//     return false;
//   }
//   for (const folder of workspaceFolders) {
//     if (uri.fsPath.startsWith(folder.uri.fsPath)) {
//       return true;
//     }
//   }
//   return false;
// }


// // // Helper function to find all enclosing DocumentSymbols for a given range
// // function findEnclosingSymbols(
// //   symbols: vscode.DocumentSymbol[],
// //   range: vscode.Range,
// //   ancestors: vscode.DocumentSymbol[] = []
// // ): vscode.DocumentSymbol[] | undefined {
// //   for (const symbol of symbols) {
// //     if (symbol.range.contains(range)) {
// //       const newAncestors = [...ancestors, symbol];
// //       const childAncestors = findEnclosingSymbols(symbol.children, range, newAncestors);
// //       if (childAncestors && childAncestors.length > 0) {
// //         return childAncestors;
// //       }
// //       return newAncestors;
// //     }
// //   }
// //   return undefined;
// // }

// // // Function to copy dependency item details to the clipboard
// // async function copyDependencyInfo(item: DependencyItem) {
// //     try {
// //         const uri = item.location.uri;
// //         const range = item.location.range;

// //         // Open the document
// //         const document = await vscode.workspace.openTextDocument(uri);

// //         // Get all DocumentSymbols for the document
// //         const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
// //             'vscode.executeDocumentSymbolProvider',
// //             uri
// //         );

// //         if (!symbols) {
// //             vscode.window.showErrorMessage(`No symbols found in ${uri.fsPath}.`);
// //             return;
// //         }

// //         // Find the enclosing symbol that fully contains the item's range
// //         const enclosingSymbol = findEnclosingSymbol(symbols, range);

// //         if (!enclosingSymbol) {
// //             vscode.window.showErrorMessage(`No enclosing symbol found for "${item.label}" in ${uri.fsPath}.`);
// //             return;
// //         }

// //         // Extract the full range of the enclosing symbol
// //         const fullRange = enclosingSymbol.range;

// //         // Get the code within the full range
// //         const code = document.getText(fullRange);

// //         // Get the relative file path
// //         const filePath = vscode.workspace.asRelativePath(uri, false);

// //         // Calculate the start and end lines (1-based indexing)
// //         const startLine = fullRange.start.line + 1;
// //         const endLine = fullRange.end.line + 1;

// //         // Format the text as specified
// //         const formattedText = `''' ${filePath} '''

// // ## lines ${startLine} - ${endLine}
// // ${code}`;

// //         // Copy the formatted text to the clipboard
// //         await vscode.env.clipboard.writeText(formattedText);

// //         // Show a confirmation message
// //         vscode.window.showInformationMessage(`Copied "${item.label}" to clipboard.`);
// //     } catch (error) {
// //         vscode.window.showErrorMessage(`Failed to copy "${item.label}": ${error}`);
// //     }
// // }

// // Helper function to find all enclosing DocumentSymbols for a given range
// function findEnclosingSymbols(
//   symbols: vscode.DocumentSymbol[],
//   range: vscode.Range,
//   ancestors: vscode.DocumentSymbol[] = []
// ): vscode.DocumentSymbol[] | undefined {
//   for (const symbol of symbols) {
//     if (symbol.range.contains(range)) {
//       const newAncestors = [...ancestors, symbol];
//       const childAncestors = findEnclosingSymbols(symbol.children, range, newAncestors);
//       if (childAncestors && childAncestors.length > 0) {
//         return childAncestors;
//       }
//       return newAncestors;
//     }
//   }
//   return undefined;
// }

// // Function to copy dependency item details to the clipboard
// async function copyDependencyInfo(item: DependencyItem) {
//   try {
//     const uri = item.location.uri;
//     const range = item.location.range;

//     // Open the document
//     const document = await vscode.workspace.openTextDocument(uri);

//     // Get all DocumentSymbols for the document
//     const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
//       'vscode.executeDocumentSymbolProvider',
//       uri
//     );

//     if (!symbols) {
//       vscode.window.showErrorMessage(`No symbols found in ${uri.fsPath}.`);
//       return;
//     }

//     // Find the list of enclosing symbols
//     const enclosingSymbols = findEnclosingSymbols(symbols, range);

//     if (!enclosingSymbols || enclosingSymbols.length === 0) {
//       vscode.window.showErrorMessage(`No enclosing symbol found for "${item.label}" in ${uri.fsPath}.`);
//       return;
//     }

//     const innermostSymbol = enclosingSymbols[enclosingSymbols.length - 1];
//     let formattedText = `####### ${vscode.workspace.asRelativePath(uri, false)}

// ## lines `;

//     let startLine: number;
//     let endLine: number;
//     let codeSnippet: string;

//     // Check if the innermost symbol is a method/function and has a parent class
//     if (enclosingSymbols.length >= 2) {
//       const parentSymbol = enclosingSymbols[enclosingSymbols.length - 2];
//       const childSymbol = innermostSymbol;

//       // If parent is a class and child is a method/function
//       if (
//         (parentSymbol.kind === vscode.SymbolKind.Class || parentSymbol.kind === vscode.SymbolKind.Interface) &&
//         (childSymbol.kind === vscode.SymbolKind.Method || childSymbol.kind === vscode.SymbolKind.Function)
//       ) {
//         // Get class range and method range
//         const classRange = parentSymbol.range;
//         const methodRange = childSymbol.range;

//         // Set lines from class start to method end
//         startLine = classRange.start.line + 1;
//         endLine = methodRange.end.line + 1;

//         // Get class signature line
//         const classStartLine = classRange.start.line;
//         const classLineText = document.lineAt(classStartLine).text;

//         // Get method code
//         const methodCode = document.getText(methodRange);

//         // Combine class signature and method code
//         codeSnippet = `${classLineText}
//     ${methodCode}`;
//       } else {
//         // If not a method within a class, just include the symbol's code
//         startLine = innermostSymbol.range.start.line + 1;
//         endLine = innermostSymbol.range.end.line + 1;
//         const symbolCode = document.getText(innermostSymbol.range);
//         codeSnippet = symbolCode;
//       }
//     } else {
//       // If only one enclosing symbol, include its code
//       startLine = innermostSymbol.range.start.line + 1;
//       endLine = innermostSymbol.range.end.line + 1;
//       const symbolCode = document.getText(innermostSymbol.range);
//       codeSnippet = symbolCode;
//     }

//     // Finalize the formatted text
//     formattedText += `${startLine} - ${endLine}

// ${codeSnippet}`;

//     // Copy the formatted text to the clipboard
//     await vscode.env.clipboard.writeText(formattedText);

//     // Show a confirmation message
//     vscode.window.showInformationMessage(`Copied "${item.label}" to clipboard.`);
//   } catch (error) {
//     vscode.window.showErrorMessage(`Failed to copy "${item.label}": ${error}`);
//   }
// }


import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new DependencyTreeProvider();

  // Register the tree data provider
  vscode.window.registerTreeDataProvider('dependencyTreeView', treeDataProvider);

  // Register the 'Build Dependency Tree' command
  let buildCommand = vscode.commands.registerCommand('extension.buildDependencyTree', () => {
    buildDependencyTree(treeDataProvider);
  });

  // Register the command to toggle the checked state
  let toggleCommand = vscode.commands.registerCommand(
    'extension.toggleDependencyItem',
    (item: DependencyItem) => {
      item.toggleChecked();
      // Refresh the tree view
      treeDataProvider.refresh(item);
    }
  );

  // Register the command to copy dependency item details
  let copyCommand = vscode.commands.registerCommand(
    'extension.copyDependencyInfo',
    async (item: DependencyItem) => {
      await copyDependencyInfo(item);
    }
  );

  context.subscriptions.push(buildCommand);
  context.subscriptions.push(toggleCommand);
  context.subscriptions.push(copyCommand);
}

export function deactivate() {}

// ... (DependencyItem and DependencyTreeProvider classes)
// Class representing each item in the dependency tree
class DependencyItem extends vscode.TreeItem {
  public children: DependencyItem[] = [];
  public isChecked: boolean = true;

  constructor(
    public readonly label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly location: vscode.Location,
    public readonly parent: DependencyItem | null = null
  ) {
    super(label, collapsibleState);
    // Assign a unique ID to each item
    this.id = parent ? `${parent.id}/${label}` : label;

    // Set the icon based on the checked state
    this.iconPath = this.getIconPath();

    // Set the context value for item-specific commands
    this.contextValue = 'dependencyItem';

    // Set the command to navigate to the symbol's definition
    this.command = {
      command: 'vscode.open',
      title: 'Open Symbol',
      arguments: [this.location.uri, { selection: this.location.range }],
    };
  }

  // Toggle the checked state
  toggleChecked(): void {
    this.isChecked = !this.isChecked;
    this.iconPath = this.getIconPath();
    // Recursively update children
    for (const child of this.children) {
      child.setCheckedRecursively(this.isChecked);
    }
  }

  // Set the checked state recursively
  setCheckedRecursively(isChecked: boolean): void {
    this.isChecked = isChecked;
    this.iconPath = this.getIconPath();
    for (const child of this.children) {
      child.setCheckedRecursively(isChecked);
    }
  }

  // Get the icon path based on the checked state
  private getIconPath(): { light: string; dark: string } {
    const iconName = this.isChecked ? 'checkbox-checked.png' : 'checkbox-unchecked.png';
    return {
      light: path.join(__filename, '..', '..', 'resources', 'light', iconName),
      dark: path.join(__filename, '..', '..', 'resources', 'dark', iconName),
    };
  }
}

// Tree data provider for the dependency tree
class DependencyTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined | void> =
    new vscode.EventEmitter<DependencyItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<DependencyItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private rootItems: DependencyItem[] = [];

  getTreeItem(element: DependencyItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DependencyItem): Thenable<DependencyItem[]> {
    if (!element) {
      // Return the root elements
      return Promise.resolve(this.rootItems);
    } else {
      // Return the children of the given element
      return Promise.resolve(element.children || []);
    }
  }

  // Implement the getParent method
  getParent(element: DependencyItem): vscode.ProviderResult<DependencyItem> {
    return element.parent;
  }

  // Method to refresh the tree view
  refresh(item?: DependencyItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  // Method to set the root items
  setRootItems(items: DependencyItem[]): void {
    this.rootItems = items;
    this.refresh();
  }
}


// Helper function to find all enclosing DocumentSymbols for a given range
function findEnclosingSymbols(
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

// Function to build the dependency tree
async function buildDependencyTree(treeDataProvider: DependencyTreeProvider) {
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

// Recursive function to get dependencies using Call Hierarchy API
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
    vscode.TreeItemCollapsibleState.Collapsed,
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
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;
  } else {
    // No outgoing calls
    dependencyItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
  }

  return dependencyItem;
}

// Helper function to check if a URI is within the workspace
function isUriInWorkspace(uri: vscode.Uri): boolean {
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
 * Recursively collects all checked DependencyItems starting from the given item.
 * @param item The root DependencyItem to start collecting from.
 * @returns An array of checked DependencyItems.
 */
function collectCheckedItems(item: DependencyItem): DependencyItem[] {
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
 * Function to copy dependency item details and its checked subitems to the clipboard.
 * The copied content is organized by file and by class to avoid repeating class signatures.
 * 
 * Example Output:
 * 
 * ''' superego/api/main.py '''
 * ### lines 41 - 54
 * def startup():
 *     # function code
 * 
 * ''' superego/scheduling_system/chatbot_manager/chatbot_manager.py '''
 * ### line 16
 * class ChatbotManager:
 *     ...
 *     ### lines 35 - 59
 *     def check_tools(self, tools_dict):
 *         # method code
 * 
 *     ### lines 61 - 71
 *     def set_tools_dict(self, tools_dict: Dict[str, Callable]) -> None:
 *         # method code
 * 
 * ''' superego/api/fast_api_utils/load.py '''
 * ### lines 12 - 30
 * def schedule_recurring_reminders(timezone, db: Session = Depends(get_db)):
 *     # function code
 * 
 * ''' superego/scheduling_system/reminder.py '''
 * ### lines 44 - 49
 * def get_db():
 *     # function code
 */
async function copyDependencyInfo(item: DependencyItem) {
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



// /**
//  * Groups DependencyItems by their file paths and enclosing classes.
//  * This prevents repeating class signatures when multiple methods from the same class are copied.
//  * @param items An array of checked DependencyItems.
//  * @param symbolsMap A map storing DocumentSymbols for each file to avoid redundant symbol retrieval.
//  * @returns A map where each key is a file path and the value is another map of class signatures to their methods.
//  */
// async function groupItemsByFileAndClass(
//   items: DependencyItem[],
//   symbolsMap: Map<string, vscode.DocumentSymbol[]>
// ): Promise<Map<string, Map<string, { startLine: number; endLine: number; code: string }[]>>> {
//   const groupedMap = new Map<string, Map<string, { startLine: number; endLine: number; code: string }[]>>();

//   for (const depItem of items) {
//     const uri = depItem.location.uri;
//     const range = depItem.location.range;

//     // Get relative file path
//     const relativeFilePath = vscode.workspace.asRelativePath(uri, false);

//     // Fetch DocumentSymbols if not already fetched
//     if (!symbolsMap.has(uri.fsPath)) {
//       const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
//         'vscode.executeDocumentSymbolProvider',
//         uri
//       );
//       if (symbols) {
//         symbolsMap.set(uri.fsPath, symbols);
//       } else {
//         vscode.window.showErrorMessage(`No symbols found in ${uri.fsPath}.`);
//         continue;
//       }
//     }

//     const symbols = symbolsMap.get(uri.fsPath)!;

//     // Find all enclosing symbols
//     const enclosingSymbols = findEnclosingSymbols(symbols, range);

//     if (!enclosingSymbols || enclosingSymbols.length === 0) {
//       vscode.window.showErrorMessage(`No enclosing symbol found for "${depItem.label}" in ${uri.fsPath}.`);
//       continue;
//     }

//     const innermostSymbol = enclosingSymbols[enclosingSymbols.length - 1];

//     let classSignature: string | null = null;
//     let formattedSnippet: string;
//     let startLine: number;
//     let endLine: number;

//     // Determine if the innermost symbol is a method within a class
//     if (enclosingSymbols.length >= 2) {
//       const parentSymbol = enclosingSymbols[enclosingSymbols.length - 2];
//       const childSymbol = innermostSymbol;

//       if (
//         (parentSymbol.kind === vscode.SymbolKind.Class || parentSymbol.kind === vscode.SymbolKind.Interface) &&
//         (childSymbol.kind === vscode.SymbolKind.Method || childSymbol.kind === vscode.SymbolKind.Function)
//       ) {
//         // Get class signature
//         const classStartLine = parentSymbol.range.start.line;
//         const classLineText = await vscode.workspace.openTextDocument(uri).then(doc => doc.lineAt(classStartLine).text);

//         // Get method code
//         const methodCode = await vscode.workspace.openTextDocument(uri).then(doc => doc.getText(childSymbol.range));

//         // Calculate lines
//         startLine = parentSymbol.range.start.line + 1; // Start from class start
//         endLine = childSymbol.range.end.line + 1;

//         // Combine class signature and method code with indentation
//         classSignature = classLineText;
//         formattedSnippet = `${methodCode}`; // Remove '### lines x - y'
//       } else {
//         // Not a method within a class
//         startLine = innermostSymbol.range.start.line + 1;
//         endLine = innermostSymbol.range.end.line + 1;
//         const symbolCode = await vscode.workspace.openTextDocument(uri).then(doc => doc.getText(innermostSymbol.range));
//         formattedSnippet = symbolCode;
//       }
//     } else {
//       // Only one enclosing symbol (e.g., top-level function or class)
//       startLine = innermostSymbol.range.start.line + 1;
//       endLine = innermostSymbol.range.end.line + 1;
//       const symbolCode = await vscode.workspace.openTextDocument(uri).then(doc => doc.getText(innermostSymbol.range));
//       formattedSnippet = symbolCode;
//     }

//     // Initialize maps if not present
//     if (!groupedMap.has(relativeFilePath)) {
//       groupedMap.set(relativeFilePath, new Map<string, { startLine: number; endLine: number; code: string }[]>());
//     }

//     const classMap = groupedMap.get(relativeFilePath)!;

//     if (classSignature) {
//       // If the class signature is not yet added, add it
//       if (!classMap.has(classSignature)) {
//         classMap.set(classSignature, []);
//       }
//       // Add the method to the class's method list
//       classMap.get(classSignature)!.push({
//         startLine,
//         endLine,
//         code: formattedSnippet,
//       });
//     } else {
//       // Standalone function or class
//       const standaloneKey = `Standalone:${depItem.label}`;
//       if (!classMap.has(standaloneKey)) {
//         classMap.set(standaloneKey, []);
//       }
//       classMap.get(standaloneKey)!.push({
//         startLine,
//         endLine,
//         code: formattedSnippet,
//       });
//     }
//   }

//   return groupedMap;
// }

/**
 * Groups DependencyItems by their file paths and enclosing classes.
 * This prevents repeating class signatures when multiple methods from the same class are copied.
 * @param items An array of checked DependencyItems.
 * @param symbolsMap A map storing DocumentSymbols for each file to avoid redundant symbol retrieval.
 * @returns A map where each key is a file path and the value is another map of class signatures to their methods.
 */
async function groupItemsByFileAndClass(
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



/**
 * Helper function to indent code by a specified number of spaces.
 * @param code The code snippet to indent.
 * @param spaces Number of spaces to indent.
 * @returns Indented code snippet.
 */
function indentCode(code: string, spaces: number): string {
  const indentation = ' '.repeat(spaces);
  return code
    .split('\n')
    .map(line => (line.trim() === '' ? line : indentation + line))
    .join('\n');
}
