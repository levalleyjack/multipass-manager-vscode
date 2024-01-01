import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  console.log('Multipass extension is now active.');

  const multipassDataProvider = new MultipassDataProvider();
  vscode.window.registerTreeDataProvider('multipassList', multipassDataProvider);
}

class MultipassDataProvider implements vscode.TreeDataProvider<string> {
  onDidChangeTreeData?: vscode.Event<string | null | undefined> | undefined;

  getTreeItem(element: string): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return new vscode.TreeItem(element);
  }

getChildren(element?: string | undefined): vscode.ProviderResult<string[]> {
	return new Promise((resolve, reject) => {
		exec('multipass list', (error: Error | null, stdout: string, stderr: string) => {
			if (error) {
				console.error(error.message);
				reject(error.message);
			} else {
				console.log(stdout); // Log the fetched data to the console
				resolve(stdout.split('\n'));
			}
		});
	});
}  
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log('Multipass extension is now deactivated.');
}
