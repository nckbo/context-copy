import * as vscode from 'vscode';
import { DependencyItem } from '../models/DependencyItem';


// Tree data provider for the dependency tree
export class DependencyTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
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