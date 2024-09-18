// src/models/FileDependencyItem.ts

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Class representing each item in the file dependency tree.
 */
export class FileDependencyItem extends vscode.TreeItem {
    public children: FileDependencyItem[] = [];
    public isChecked: boolean = true;

    // Remove `readonly` from the `parent` property
    public parent: FileDependencyItem | null = null;

    constructor(
        public readonly label: string, // Only file name
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly uri: vscode.Uri,
        parent: FileDependencyItem | null = null // Optional parameter for initial assignment
    ) {
        super(label, collapsibleState);
        this.parent = parent;  // Parent can be set at construction or later on
        this.id = parent ? `${parent.id}/${label}` : label;
        this.iconPath = this.getIconPath();
        this.tooltip = this.uri.fsPath; // Full path as tooltip
        this.description = ''; // Optional: leave empty or use for additional info

        // Set the context value for item-specific commands
        this.contextValue = 'fileDependencyItem';

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

    /**
     * Determines the appropriate icon based on the file type and checked state.
     * @returns The path to the icon.
     */
    private getIconPath(): { light: string; dark: string } {
        // Determine the checkmark icon based on the checked state
        const checkmarkIconName = this.isChecked ? 'checkbox-checked.png' : 'checkbox-unchecked.png';

        return {
            light: path.join(__dirname, '..', '..', 'resources', 'light', checkmarkIconName),
            dark: path.join(__dirname, '..', '..', 'resources', 'dark', checkmarkIconName),
        };
    }
}
