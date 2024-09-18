// src/models/FileItem.ts
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Class representing each item in the file tree.
 */
export class FileItem extends vscode.TreeItem {
    public children: FileItem[] = [];
    public isChecked: boolean = true;

    constructor(
        public readonly label: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly uri: vscode.Uri,
        public readonly parent: FileItem | null = null
    ) {
        super(label, collapsibleState);
        this.tooltip = this.uri.fsPath;
        this.description = this.uri.fsPath;

        // Assign a unique ID to each item
        this.id = parent ? `${parent.id}/${label}` : label;

        // Set the icon based on the file type
        this.iconPath = this.getIconPath();

        // Set the context value for item-specific commands
        this.contextValue = 'fileItem';

        // Set the command to open the file if it's not a directory
        if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [this.uri],
            };
        }
    }

    /**
     * Toggles the checked state of the item and its children.
     */
    toggleChecked(): void {
        this.isChecked = !this.isChecked;
        this.iconPath = this.getIconPath();
        // Recursively update children
        for (const child of this.children) {
            child.setCheckedRecursively(this.isChecked);
        }
    }

    /**
     * Sets the checked state recursively for all children.
     * @param isChecked The state to set.
     */
    setCheckedRecursively(isChecked: boolean): void {
        this.isChecked = isChecked;
        this.iconPath = this.getIconPath();
        for (const child of this.children) {
            child.setCheckedRecursively(isChecked);
        }
    }

    /**
     * Toggles the checked state of all children without affecting this item.
     */
    toggleChildren(): void {
        const allChildrenChecked = this.children.every(child => child.isChecked);
        const newState = !allChildrenChecked;
        for (const child of this.children) {
            child.setCheckedRecursively(newState);
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

    // /**
    //  * Determines the appropriate icon based on the file type and checked state.
    //  * @returns The path to the icon.
    //  */
    // private getIconPath(): { light: string; dark: string } {
    //     let iconName = 'file.png'; // Default icon

    //     if (this.collapsibleState !== vscode.TreeItemCollapsibleState.None) { // Directory
    //         iconName = 'folder.png';
    //     } else if (this.label.endsWith('.ts') || this.label.endsWith('.py')) {
    //         iconName = this.label.endsWith('.ts') ? 'typescript.png' : 'python.png';
    //     }

    //     return {
    //         light: path.join(__filename, '..', '..', 'resources', 'light', iconName),
    //         dark: path.join(__filename, '..', '..', 'resources', 'dark', iconName),
    //     };
    // }
// }
