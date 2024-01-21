import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  console.log("Multipass extension is now active.");

  const multipassDataProvider = new MultipassDataProvider(
    context.extensionPath,
  );
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
  );

  vscode.window.registerTreeDataProvider(
    "multipassList",
    multipassDataProvider,
  );

  const instanceCommands = vscode.commands.registerCommand(
    "multipass.setup",
    async () => {
      const options: vscode.QuickPickItem[] = [
        {
          label: "Add Instance",
          description: "Add a regular Multipass instance",
        },
        {
          label: "Add Instance with VSCode Remote SSH Setup (Mac Only)",
          description: "Add an instance with VSCode Remote - SSH setup (Mac Only)",
        },
      ];

      const selectedOption = await vscode.window.showQuickPick(options);

      if (!selectedOption) {
        return;
      }

      if (selectedOption.label === "Add Instance") {
        await addRegularInstance();
      } else if (
        selectedOption.label === "Add Instance with VSCode Remote SSH Setup (Mac Only)"
      ) {
        await addInstanceWithVSCodeSSHSetup();
      }
    },
  );

  context.subscriptions.push(instanceCommands);

  async function addRegularInstance() {
    let genname = false;
    const instanceName = await vscode.window.showInputBox({
      prompt: "Enter the name of the new instance",
    });
    if (!instanceName) {
      genname = true;
    }

    statusBarItem.text = "$(sync~spin) Launching instance...";
    statusBarItem.show();
    vscode.window.showInformationMessage(`Launching new instance...`);
    try {
      if (genname == false) {
        await executeCommand(`multipass launch --name ${instanceName}`);
      } else {
        await executeCommand(`multipass launch`);
      }
      multipassDataProvider.refresh();
      vscode.window.showInformationMessage(`Instance launched`);
    } catch (error) {
      console.error(`Error launching instance: ${(error as Error).message}`);
      vscode.window.showErrorMessage(
        `Error launching instance: ${(error as Error).message}`,
      );
    } finally {
      statusBarItem.hide();
    }

    vscode.window.showInformationMessage(
      `Regular instance added: ${instanceName}`,
    );
  }

  async function addInstanceWithVSCodeSSHSetup() {
    const instanceName = await vscode.window.showInputBox({
      prompt: "Enter the name of the new instance",
    });
    if (!instanceName) {
      return;
    }
    statusBarItem.text = "$(sync~spin) Launching instance...";
    statusBarItem.show();
    vscode.window.showInformationMessage(`Launching new instance... may take a while`);

    const sshKeyPath = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      ".ssh",
      "multipass_id_rsa",
    );
    
    let keyExists = false;
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(`${sshKeyPath}.pub`));
      keyExists = true;
    } catch (error) {}

    if (!keyExists) {
      const option = await vscode.window.showInformationMessage(
        "No SSH key found. Do you want to create a new key (multipass_id_rsa)?", 
        { modal: true }, 
        "Yes", 
        "No"
      );

      if (option === "Yes") {
        await executeCommand(`ssh-keygen -t rsa -f ${sshKeyPath} -N "" -q`);
      } else {
        return;
      }
    }
    
    const publicKey = await vscode.workspace.fs.readFile(
      vscode.Uri.file(`${sshKeyPath}.pub`),
    );
    const publicKeyContent = Buffer.from(publicKey).toString("utf-8");
    console.log(publicKeyContent);

    const cloudInitContent = `groups:\n  - vscode\nruncmd:\n  - adduser ubuntu vscode\nssh_authorized_keys:\n  - ${publicKeyContent}`;
    const cloudInitPath = path.join(
      context.extensionPath,
      "vscode-multipass.yaml",
    );
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(cloudInitPath),
      Buffer.from(cloudInitContent, "utf-8"),
    );

    console.log("hello");
    await executeCommand(
      `multipass launch --cloud-init ${cloudInitPath} --name ${instanceName}`,
    );
    console.log(
      `multipass launch --cloud-init ${cloudInitPath} --name ${instanceName}`,
    );

    const infoCommand = `multipass info ${instanceName} --format json`;
exec(infoCommand, (error, stdout) => {
  if (error) {
    console.error(`Error getting IP address: ${error.message}`);
    vscode.window.showErrorMessage(
      `Error getting IP address: ${error.message}`,
    );
    return;
  }
  multipassDataProvider.refresh();

  statusBarItem.hide();

  // Parse the JSON output and get the IP address
  const info = JSON.parse(stdout);
  const ipAddress = info.info[instanceName].ipv4[0];
  
  vscode.window.showInformationMessage(
    `Instance with VSCode SSH setup added: ${instanceName}`,
    { modal: true },
    'OK',
    'Copy SSH Command to Clipboard'
  ).then(selection => {
    if (selection === 'OK') {
      vscode.window.showInformationMessage(`Enter the following into Remote SSH: ssh ubuntu@${ipAddress} -i ${sshKeyPath}`);
      return;
    }
    if (selection === 'Copy SSH Command to Clipboard') {
      const sshCommand = `ssh ubuntu@${ipAddress} -i ${sshKeyPath}`;
      vscode.env.clipboard.writeText(sshCommand).then(() => {
        vscode.window.showInformationMessage('SSH command copied to clipboard.');
      });
      return;
    }
  });
});

    vscode.window.showInformationMessage(
      `Instance with VSCode SSH setup added: ${instanceName}`,
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("multipass.refresh", async () => {
      vscode.window.setStatusBarMessage("Refreshing multipass list...", 5000);

      try {
        multipassDataProvider.refresh();
        vscode.window.showInformationMessage("Multipass list refreshed.");
      } catch (error) {
        console.error(
          `Error refreshing multipass list: ${(error as Error).message}`,
        );
        vscode.window.showErrorMessage(
          `Error refreshing multipass list: ${(error as Error).message}`,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.start",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Starting instance...";
        statusBarItem.show();
        vscode.window.showInformationMessage(
          `Starting instance: ${rowData.name}`,
        );
        try {
          await executeCommand(`multipass start ${rowData.name}`);
          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance started: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error starting instance: ${(error as Error).message}`);
          vscode.window.showErrorMessage(
            `Error starting instance: ${(error as Error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.stop",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Stopping instance...";
        statusBarItem.show();

        try {
          await executeCommand(`multipass stop ${rowData.name}`);

          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance stopped: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error stopping instance: ${(<Error>error).message}`);
          vscode.window.showErrorMessage(
            `Error stopping instance: ${(<Error>error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );

  let genname = false;
  context.subscriptions.push(
    vscode.commands.registerCommand("multipass.launch", async () => {
      const instanceName = await vscode.window.showInputBox({
        prompt: "Enter the name of the new instance",
      });
      if (!instanceName) {
        genname = true;
      }

      statusBarItem.text = "$(sync~spin) Launching instance...";
      statusBarItem.show();
      vscode.window.showInformationMessage(`Launching new instance...`);
      try {
        if (genname == false) {
          await executeCommand(`multipass launch --name ${instanceName}`);
        } else {
          await executeCommand(`multipass launch`);
        }
        multipassDataProvider.refresh();
        vscode.window.showInformationMessage(`Instance launched`);
      } catch (error) {
        console.error(`Error launching instance: ${(error as Error).message}`);
        vscode.window.showErrorMessage(
          `Error launching instance: ${(error as Error).message}`,
        );
      } finally {
        statusBarItem.hide();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.suspend",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Suspending instance...";
        statusBarItem.show();

        try {
          await executeCommand(`multipass suspend ${rowData.name}`);

          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance suspended: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error suspending instance: ${(<Error>error).message}`);
          vscode.window.showErrorMessage(
            `Error suspending instance: ${(<Error>error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.delete",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Deleting instance...";
        statusBarItem.show();

        try {
          await executeCommand(`multipass delete ${rowData.name}`);

          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance deleted: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error deleting instance: ${(<Error>error).message}`);
          vscode.window.showErrorMessage(
            `Error deleting instance: ${(<Error>error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.shell",
      (rowData: MultipassItem) => {
        const terminal = vscode.window.createTerminal(
          `Multipass - ${rowData.name}`,
        );
        terminal.sendText(`multipass shell ${rowData.name}`);
        terminal.show();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("multipass.purge", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Are you sure you want to purge all deleted instances?",
        "Yes",
        "No",
      );
      if (confirm !== "Yes") {
        return;
      }

      statusBarItem.text = "$(sync~spin) Purging Instances";
      statusBarItem.show();

      try {
        await executeCommand(`multipass purge`);

        multipassDataProvider.refresh();
        vscode.window.showInformationMessage(`All Instances Purged`);
      } catch (error) {
        console.error(`Error purging instances: ${(<Error>error).message}`);
        vscode.window.showErrorMessage(
          `Error purging instances: ${(<Error>error).message}`,
        );
      } finally {
        statusBarItem.hide();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.recover",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Recovering instance...";
        statusBarItem.show();

        try {
          await executeCommand(`multipass recover ${rowData.name}`);

          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance recovered: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error recovering instance: ${(<Error>error).message}`);
          vscode.window.showErrorMessage(
            `Error recovering instance: ${(<Error>error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.restart",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Restarting instance...";
        statusBarItem.show();

        try {
          await executeCommand(`multipass restart ${rowData.name}`);

          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance restarted: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error restarting instance: ${(<Error>error).message}`);
          vscode.window.showErrorMessage(
            `Error restarting instance: ${(<Error>error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.execute",
      async (rowData: MultipassItem) => {
        statusBarItem.text = "$(sync~spin) Deleting instance...";
        statusBarItem.show();

        try {
          await executeCommand(`multipass delete ${rowData.name}`);

          multipassDataProvider.refresh();
          vscode.window.showInformationMessage(
            `Instance deleted: ${rowData.name}`,
          );
        } catch (error) {
          console.error(`Error deleting instance: ${(<Error>error).message}`);
          vscode.window.showErrorMessage(
            `Error deleting instance: ${(<Error>error).message}`,
          );
        } finally {
          statusBarItem.hide();
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multipass.exec",
      async (rowData: MultipassItem) => {
        const command = await vscode.window.showInputBox({
          prompt: "Enter the command you want to execute in the instance",
        });
        if (!command) {
          return;
        }

        const terminal = vscode.window.createTerminal(
          `Multipass - ${rowData.name}`,
        );
        terminal.show();
        terminal.sendText(`multipass exec ${rowData.name} ${command}`);
      },
    ),
  );
}

async function executeCommand(command: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec(command, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

class MultipassDataProvider implements vscode.TreeDataProvider<MultipassItem> {
  constructor(private extensionPath: string) {}
  private _onDidChangeTreeData: vscode.EventEmitter<
    MultipassItem | null | undefined
  > = new vscode.EventEmitter<MultipassItem | null | undefined>();
  readonly onDidChangeTreeData: vscode.Event<MultipassItem | null | undefined> =
    this._onDidChangeTreeData.event;

  getTreeItem(
    element: MultipassItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: MultipassItem): vscode.ProviderResult<MultipassItem[]> {
    return new Promise((resolve, reject) => {
      exec(
        "multipass list --format json",
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(error.message);
            reject(error.message);
          } else {
            const data = JSON.parse(stdout);
            const instances = data.list.map(
              (item: {
                name: string;
                release: string;
                state: string;
                ipv4: string[];
              }) =>
                new MultipassItem(
                  item.name,
                  item.release,
                  item.state,
                  item.ipv4[0],
                ),
            );

            resolve(instances);
          }
        },
      );
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

class MultipassItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly release: string,
    public readonly state: string,
    public readonly ipv4: string,
  ) {
    super(
      `${name} - ${state} - ${release} - ${ipv4}`,
      vscode.TreeItemCollapsibleState.None,
    );

    this.contextValue = "instance";

    if (state.toLowerCase() === "running") {
      this.iconPath = {
        light: path.join(
          __filename,
          "..",
          "..",
          "media",
          "light",
          "circle-filled.svg",
        ),
        dark: path.join(
          __filename,
          "..",
          "..",
          "media",
          "dark",
          "circle-filled.svg",
        ),
      };
    } else if (state.toLowerCase() === "suspended") {
      this.iconPath = {
        light: path.join(
          __filename,
          "..",
          "..",
          "media",
          "light",
          "square.svg",
        ),
        dark: path.join(__filename, "..", "..", "media", "dark", "square.svg"),
      };
    } else {
      this.iconPath = {
        light: path.join(
          __filename,
          "..",
          "..",
          "media",
          "light",
          "circle-hollow.svg",
        ),
        dark: path.join(
          __filename,
          "..",
          "..",
          "media",
          "dark",
          "circle-hollow.svg",
        ),
      };
    }
  }
}

export function deactivate() {
  console.log("Multipass extension is now deactivated.");
}
