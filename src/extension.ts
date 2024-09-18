// src/extension.ts

import * as vscode from 'vscode';
import { DependencyTreeProvider } from './providers/DependencyTreeProvider';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { FileDependencyTreeProvider } from './providers/FileDependencyTreeProvider';
import { registerBuildDependencyTreeCommand } from './commands/buildDependencyTree';
import { registerToggleDependencyItemCommand } from './commands/toggleDependencyItem';
import { registerToggleChildrenCommand } from './commands/toggleChildren';
import { registerCopyDependencyInfoCommand } from './commands/copyDependencyInfo';
import { registerPrintRelevantImportsCommand } from './commands/printRelevantImports';
import { registerCopyWorkspaceStructureCommand } from './commands/copyWorkspaceStructure';
import { registerToggleFileItemCommand } from './commands/toggleFileItem';
import { registerToggleFileChildrenCommand } from './commands/toggleFileChildren';
import { registerCopySelectedFilesCommand } from './commands/copySelectedFiles';
import { registerToggleFileDependencyItemCommand } from './commands/toggleFileDependencyItem';
import { registerToggleFileDependencyChildrenCommand } from './commands/toggleFileDependencyChildren';
import { registerCopyFileDependencyInfoCommand } from './commands/copyFileDependencyInfo';
import { registerBuildFileDependencyTreeCommand } from './commands/buildFileDependencyTree'; // New Import
import { registerShowFileDependencyTreeViewCommand } from './commands/showFileDependencyTreeView'; // Ensure this is created

export function activate(context: vscode.ExtensionContext) {
    // Initialize Providers
    const dependencyTreeProvider = new DependencyTreeProvider();
    const fileTreeProvider = new FileTreeProvider();
    const fileDependencyTreeProvider = new FileDependencyTreeProvider();

    // Register Tree Data Providers
    vscode.window.registerTreeDataProvider('dependencyTreeView', dependencyTreeProvider);
    vscode.window.registerTreeDataProvider('fileTreeView', fileTreeProvider);
    vscode.window.registerTreeDataProvider('fileDependencyTreeView', fileDependencyTreeProvider); // New View

    // Register Commands for Dependency Tree
    const buildCommand = registerBuildDependencyTreeCommand(dependencyTreeProvider, context);
    const toggleDependencyCommand = registerToggleDependencyItemCommand(dependencyTreeProvider, context);
    const toggleDependencyChildrenCommand = registerToggleChildrenCommand(dependencyTreeProvider, context);
    const copyDependencyInfoCommand = registerCopyDependencyInfoCommand(context);
    const printImportsCommand = registerPrintRelevantImportsCommand(context);
    const copyWorkspaceStructureCommand = registerCopyWorkspaceStructureCommand(context);

    // Register Commands for File Tree
    const toggleFileItemCommand = registerToggleFileItemCommand(fileTreeProvider, context);
    const toggleFileChildrenCommand = registerToggleFileChildrenCommand(fileTreeProvider, context);
    const copySelectedFilesCommand = registerCopySelectedFilesCommand(context);

    // Register Commands for File Dependency Tree
    const toggleFileDependencyItemCommand = registerToggleFileDependencyItemCommand(fileDependencyTreeProvider, context);
    const toggleFileDependencyChildrenCommand = registerToggleFileDependencyChildrenCommand(fileDependencyTreeProvider, context);
    const copyFileDependencyInfoCommand = registerCopyFileDependencyInfoCommand(context);
    const buildFileDependencyTreeCommand = registerBuildFileDependencyTreeCommand(fileDependencyTreeProvider, context); // New Command
    const showFileDependencyTreeViewCommand = registerShowFileDependencyTreeViewCommand(context); // New Command

    // Add Commands to Subscriptions
    context.subscriptions.push(
        buildCommand,
        toggleDependencyCommand,
        toggleDependencyChildrenCommand,
        copyDependencyInfoCommand,
        printImportsCommand,
        copyWorkspaceStructureCommand,
        toggleFileItemCommand,
        toggleFileChildrenCommand,
        copySelectedFilesCommand,
        toggleFileDependencyItemCommand,
        toggleFileDependencyChildrenCommand,
        copyFileDependencyInfoCommand,
        buildFileDependencyTreeCommand, // New Command
        showFileDependencyTreeViewCommand // New Command
    );
}

export function deactivate() {}
