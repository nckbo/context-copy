// src/providers/FileDependencyTreeProvider.ts

import * as vscode from 'vscode';
import { FileDependencyItem } from '../models/FileDependencyItem';

/**
 * Tree data provider for the file dependency tree.
 */
export class FileDependencyTreeProvider implements vscode.TreeDataProvider<FileDependencyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileDependencyItem | undefined | void> =
        new vscode.EventEmitter<FileDependencyItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileDependencyItem | undefined | void> =
        this._onDidChangeTreeData.event;

    private rootItems: FileDependencyItem[] = [];

    constructor() {
        this.refresh();
        // Watch for file system changes to refresh the tree
        vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh(), this, []);
        vscode.workspace.onDidCreateFiles(() => this.refresh(), this, []);
        vscode.workspace.onDidDeleteFiles(() => this.refresh(), this, []);
        vscode.workspace.onDidRenameFiles(() => this.refresh(), this, []);
    }

    /**
     * Refreshes the tree view.
     * @param item Optional FileDependencyItem to refresh a specific part of the tree.
     */
    refresh(item?: FileDependencyItem): void {
        if (item) {
            // Refresh only the specified item
            this._onDidChangeTreeData.fire(item);
        } else {
            // Rebuild the entire tree
            this._onDidChangeTreeData.fire();
        }
    }

    /**
     * Provides the TreeItem for a given FileDependencyItem.
     * @param element The FileDependencyItem.
     * @returns The TreeItem.
     */
    getTreeItem(element: FileDependencyItem): vscode.TreeItem {
        return element;
    }

    /**
     * Provides the children of a given FileDependencyItem.
     * @param element The parent FileDependencyItem.
     * @returns An array of child FileDependencyItems.
     */
    getChildren(element?: FileDependencyItem): vscode.ProviderResult<FileDependencyItem[]> {
        if (!element) {
            // Return root items
            return this.rootItems;
        } else {
            return element.children;
        }
    }

    /**
     * Provides the parent of a given FileDependencyItem.
     * @param element The FileDependencyItem.
     * @returns The parent FileDependencyItem.
     */
    getParent(element: FileDependencyItem): vscode.ProviderResult<FileDependencyItem> {
        return element.parent;
    }

    /**
     * Sets the root items for the dependency tree.
     * @param items Array of root FileDependencyItems.
     */
    setRootItems(items: FileDependencyItem[]): void {
        this.rootItems = items;
        this.refresh();
    }
}




// // src/providers/FileDependencyTreeProvider.ts
// import * as vscode from 'vscode';
// import { FileDependencyItem } from '../models/FileDependencyItem';
// import * as path from 'path';
// import * as fs from 'fs';
// import { parseDependencies } from '../utils/dependencyParser'; // We'll create this utility

// /**
//  * Tree data provider for the file dependency tree.
//  */
// export class FileDependencyTreeProvider implements vscode.TreeDataProvider<FileDependencyItem> {
//     private _onDidChangeTreeData: vscode.EventEmitter<FileDependencyItem | undefined | void> =
//         new vscode.EventEmitter<FileDependencyItem | undefined | void>();
//     readonly onDidChangeTreeData: vscode.Event<FileDependencyItem | undefined | void> =
//         this._onDidChangeTreeData.event;

//     private rootItems: FileDependencyItem[] = [];
//     private dependencyCache: Map<string, string[]> = new Map(); // Cache file dependencies

//     constructor() {
//         this.refresh();
//         // Watch for file system changes to refresh the tree
//         vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh(), this, []);
//         vscode.workspace.onDidCreateFiles(() => this.refresh(), this, []);
//         vscode.workspace.onDidDeleteFiles(() => this.refresh(), this, []);
//         vscode.workspace.onDidRenameFiles(() => this.refresh(), this, []);
//     }

//     /**
//      * Refreshes the tree view.
//      * @param item Optional FileDependencyItem to refresh a specific part of the tree.
//      */
//     refresh(item?: FileDependencyItem): void {
//         if (item) {
//             // Refresh only the specified item
//             this._onDidChangeTreeData.fire(item);
//         } else {
//             // Rebuild the entire tree
//             this.buildDependencyTree();
//             this._onDidChangeTreeData.fire();
//         }
//     }

//     /**
//      * Provides the TreeItem for a given FileDependencyItem.
//      * @param element The FileDependencyItem.
//      * @returns The TreeItem.
//      */
//     getTreeItem(element: FileDependencyItem): vscode.TreeItem {
//         return element;
//     }

//     /**
//      * Provides the children of a given FileDependencyItem.
//      * @param element The parent FileDependencyItem.
//      * @returns An array of child FileDependencyItems.
//      */
//     getChildren(element?: FileDependencyItem): vscode.ProviderResult<FileDependencyItem[]> {
//         if (!element) {
//             // Return root items
//             return this.rootItems;
//         } else {
//             return element.children;
//         }
//     }

//     /**
//      * Provides the parent of a given FileDependencyItem.
//      * @param element The FileDependencyItem.
//      * @returns The parent FileDependencyItem.
//      */
//     getParent(element: FileDependencyItem): vscode.ProviderResult<FileDependencyItem> {
//         return element.parent;
//     }

//     /**
//      * Builds the entire dependency tree starting from all root files.
//      */
//     private buildDependencyTree(): void {
//         this.dependencyCache.clear();
//         this.rootItems = [];

//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders || workspaceFolders.length === 0) {
//             this.rootItems = [];
//             return;
//         }

//         const rootPath = workspaceFolders[0].uri.fsPath;

//         // Get all relevant files in the workspace
//         const allFiles = this.getAllFiles(rootPath);

//         // Identify entry points (files not imported by any other files)
//         const importedFiles = new Set<string>();
//         for (const file of allFiles) {
//             const dependencies = parseDependencies(file, rootPath);
//             dependencies.forEach(dep => importedFiles.add(dep));
//         }

//         const entryFiles = allFiles.filter(file => !importedFiles.has(file));

//         // Build the tree for each entry file
//         for (const file of entryFiles) {
//             const relativePath = path.relative(rootPath, file);
//             const item = new FileDependencyItem(
//                 relativePath,
//                 vscode.TreeItemCollapsibleState.Collapsed,
//                 vscode.Uri.file(file),
//                 null
//             );
//             this.rootItems.push(item);
//             this.buildDependenciesRecursively(item, file, rootPath, new Set<string>());
//         }
//     }

//     /**
//      * Recursively builds dependencies for a given file.
//      * @param parentItem The parent FileDependencyItem.
//      * @param filePath The absolute path of the current file.
//      * @param rootPath The root path of the workspace.
//      * @param visited A set of already visited files to prevent infinite recursion.
//      */
//     private buildDependenciesRecursively(
//         parentItem: FileDependencyItem,
//         filePath: string,
//         rootPath: string,
//         visited: Set<string>
//     ): void {
//         if (visited.has(filePath)) {
//             return; // Prevent infinite loops
//         }
//         visited.add(filePath);

//         // Get dependencies from cache or parse
//         let dependencies: string[] = [];
//         if (this.dependencyCache.has(filePath)) {
//             dependencies = this.dependencyCache.get(filePath)!;
//         } else {
//             dependencies = parseDependencies(filePath, rootPath);
//             this.dependencyCache.set(filePath, dependencies);
//         }

//         for (const dep of dependencies) {
//             const depPath = path.resolve(path.dirname(filePath), dep);
//             if (!fs.existsSync(depPath)) {
//                 continue; // Skip if dependency file does not exist
//             }

//             const relativeDepPath = path.relative(rootPath, depPath);
//             const depItem = new FileDependencyItem(
//                 relativeDepPath,
//                 vscode.TreeItemCollapsibleState.Collapsed,
//                 vscode.Uri.file(depPath),
//                 parentItem
//             );
//             parentItem.children.push(depItem);

//             // Recursively build dependencies for the child
//             this.buildDependenciesRecursively(depItem, depPath, rootPath, visited);
//         }
//     }

//     /**
//      * Retrieves all relevant files (.ts and .py) in the workspace, excluding certain directories.
//      * @param dir The directory to search.
//      * @returns An array of absolute file paths.
//      */
//     private getAllFiles(dir: string): string[] {
//         let results: string[] = [];
//         const list = fs.readdirSync(dir, { withFileTypes: true });

//         for (const dirent of list) {
//             const name = dirent.name;
//             const fullPath = path.join(dir, name);

//             // Exclude directories starting with ., __, or node_modules
//             if (dirent.isDirectory()) {
//                 if (name.startsWith('.') || name.startsWith('__') || name === 'node_modules') {
//                     continue;
//                 }
//                 results = results.concat(this.getAllFiles(fullPath));
//             } else {
//                 if (name.endsWith('.ts') || name.endsWith('.py')) {
//                     results.push(fullPath);
//                 }
//             }
//         }

//         return results;
//     }
// }
