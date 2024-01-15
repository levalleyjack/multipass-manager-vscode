import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

/*suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
*/

/*I need you to write a vscode extension that will take the multipass CLI and create a visual UI for its commands. When you click on the sidebar, the tab will list the result from the command multipass list. When you right click you can modify that specific instance (ex "multipass start" for starting the instance) and such. 

Here is what the multipass list output looks like:

Name                    State             IPv4             Image
primary                 Deleted           --               Not Available
complete-stallion       Running           192.168.64.5     Ubuntu 22.04 LTS
especial-loon           Deleted           --               Not Available
ubuntu                  Deleted           --               Not Available
*/
