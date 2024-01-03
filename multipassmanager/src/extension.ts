import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  console.log('Multipass extension is now active.');

  const multipassDataProvider = new MultipassDataProvider();
  vscode.window.registerTreeDataProvider('multipassList', multipassDataProvider);

  context.subscriptions.push(vscode.commands.registerCommand('extension.startInstance', (rowData: MultipassItem) => {
    exec(`multipass start ${rowData.name}`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error starting instance: ${error.message}`);
        vscode.window.showErrorMessage(`Error starting instance: ${error.message}`);
      } else {
        console.log(`Instance started: ${stdout}`);
        vscode.window.showInformationMessage(`Instance started: ${stdout}`);
        multipassDataProvider.refresh();
      }
    });
  }));

  context.subscriptions.push(vscode.commands.registerCommand('multipass.stop', (rowData: MultipassItem) => {
    exec(`multipass stop ${rowData.name}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping instance: ${error.message}`);
        vscode.window.showErrorMessage(`Error stopping instance: ${error.message}`);
      } else {
        console.log(`Instance stopped: ${stdout}`);
        vscode.window.showInformationMessage(`Instance stopped: ${stdout}`);
        multipassDataProvider.refresh();
      }
    });
  }));
}

class MultipassDataProvider implements vscode.TreeDataProvider<MultipassItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MultipassItem | null | undefined> = new vscode.EventEmitter<MultipassItem | null | undefined>();
  readonly onDidChangeTreeData: vscode.Event<MultipassItem | null | undefined> = this._onDidChangeTreeData.event;

  getTreeItem(element: MultipassItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: MultipassItem): vscode.ProviderResult<MultipassItem[]> {
    return new Promise((resolve, reject) => {
      exec('multipass list', (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(error.message);
          reject(error.message);
        } else {
          const lines = stdout.split('\n');
          // Skip the first line (header) and last line (empty after split)
          const instances = lines.slice(1, -1).map(line => {
            const [name, otherData] = line.split(/\s+/);
            return new MultipassItem(name, otherData, vscode.TreeItemCollapsibleState.None);
          });

          resolve(instances);
        }
      });
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class MultipassItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly otherData: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${name} - ${otherData}`, collapsibleState);
    this.contextValue = 'instance';
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log('Multipass extension is now deactivated.');
}
