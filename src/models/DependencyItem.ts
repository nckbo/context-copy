import * as vscode from 'vscode';
import * as path from 'path';

// Class representing each item in the dependency tree
export class DependencyItem extends vscode.TreeItem {
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

    // Toggle only children without affecting this element
    toggleChildren(): void {
      const allChildrenToggled = this.children.every(child => child.isChecked);

      // If all children are toggled, untoggle all
      const newState = !allChildrenToggled;
      
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