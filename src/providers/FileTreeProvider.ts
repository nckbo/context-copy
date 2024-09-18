// src/providers/FileTreeProvider.ts
import * as vscode from 'vscode';
import { FileItem } from '../models/FileItem';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Tree data provider for the file structure.
 */
export class FileTreeProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | void> =
        new vscode.EventEmitter<FileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | void> =
        this._onDidChangeTreeData.event;

    private rootItems: FileItem[] = [];

    // Define allowed file extensions
    private allowedExtensions: Set<string> = new Set([
        '.ts',
        '.py',
        '.js',
        '.java',
        '.c',
        '.cpp',
        '.html',
        '.css',
        '.md',
        '.txt',
        // Add more extensions as needed
    ]);

    // Define excluded directory patterns
    private excludedDirs: Set<string> = new Set([
        'node_modules',
        '__pycache__',
        '__',
        // Add more directories or patterns as needed
    ]);

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
     * @param item Optional FileItem to refresh a specific part of the tree.
     */
    refresh(item?: FileItem): void {
        if (item) {
            // Refresh only the specified item
            this._onDidChangeTreeData.fire(item);
        } else {
            // Rebuild the entire tree
            this.buildFileTree();
            this._onDidChangeTreeData.fire();
        }
    }

    /**
     * Provides the TreeItem for a given FileItem.
     * @param element The FileItem.
     * @returns The TreeItem.
     */
    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    /**
     * Provides the children of a given FileItem.
     * @param element The parent FileItem.
     * @returns An array of child FileItems.
     */
    getChildren(element?: FileItem): vscode.ProviderResult<FileItem[]> {
        if (!element) {
            // Return root items
            return this.rootItems;
        } else {
            return element.children;
        }
    }

    /**
     * Provides the parent of a given FileItem.
     * @param element The FileItem.
     * @returns The parent FileItem.
     */
    getParent(element: FileItem): vscode.ProviderResult<FileItem> {
        return element.parent;
    }

    /**
     * Builds the file tree starting from the workspace root.
     */
    private buildFileTree(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.rootItems = [];
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const rootUri = vscode.Uri.file(rootPath);
        this.rootItems = this.buildDirectoryTree(rootUri, null);
    }

    /**
     * Recursively builds the directory tree, filtering for .ts and .py files.
     * @param uri The URI of the current directory.
     * @param parent The parent FileItem.
     * @returns An array of FileItems representing the directory's contents.
     */
/**
 * Recursively builds the directory tree, filtering for allowed file extensions
 * and excluding specified directories.
 * @param uri The URI of the current directory.
 * @param parent The parent FileItem.
 * @returns An array of FileItems representing the directory's contents.
 */
private buildDirectoryTree(uri: vscode.Uri, parent: FileItem | null): FileItem[] {
    let items: FileItem[] = [];
    try {
        const dirents = fs.readdirSync(uri.fsPath, { withFileTypes: true });
        // Sort directories first, then files
        dirents.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) {return -1;}
            if (!a.isDirectory() && b.isDirectory()) {return 1;}
            return a.name.localeCompare(b.name);
        });

        for (const dirent of dirents) {
            const name = dirent.name;
            const isDirectory = dirent.isDirectory();
            const itemUri = vscode.Uri.joinPath(uri, name);

            // Exclude directories that match excluded patterns
            if (isDirectory) {
                // Check if the directory should be excluded
                if (
                    name.startsWith('.') || // Exclude hidden directories
                    name.startsWith('__') || // Exclude directories starting with '__'
                    this.excludedDirs.has(name) // Exclude specific directories like 'node_modules'
                ) {
                    continue; // Skip this directory
                }
            }

            // Include directories or files with allowed extensions
            if (isDirectory || this.allowedExtensions.has(path.extname(name).toLowerCase())) {
                const treeItem = new FileItem(
                    name,
                    isDirectory
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None,
                    itemUri,
                    parent
                );

                if (isDirectory) {
                    treeItem.children = this.buildDirectoryTree(itemUri, treeItem);
                    // Update collapsible state based on children
                    treeItem.collapsibleState = treeItem.children.length > 0
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None;
                }

                items.push(treeItem);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading directory ${uri.fsPath}: ${error}`);
    }

    return items;
}

}
