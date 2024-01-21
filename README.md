# Mutlipass Manager for Visual Studio Code

The Multipass Manager extension for Visual Studio Code enhances your development workflow by providing seamless integration with Multipass, a lightweight and efficient virtual machine manager. Manage your Multipass instances directly from VS Code, starting and stopping instances with a simple click. The extension offers a clear overview of your Multipass environment through an interactive tree view, making it easy to monitor the status of your virtual machines. The Multipass Manager extension streamlines your development setup, allowing you to focus on building and testing without the hassle of managing virtual machines manually through a CLI.

## Features

Key Features:
- Start and stop Multipass instances with a single click.
- View detailed information about each Multipass instance.
- Intuitive tree view for easy navigation and management.
- Automatically setup SSH and connect to instances through VSCode with ease

<figure>
  <img src="https://raw.githubusercontent.com/levalleyjack/multipass-manager-vscode/main/multipassmanager/media/features.png" alt="Overview" />
</figure>
<figure>
  <img src="https://raw.githubusercontent.com/levalleyjack/multipass-manager-vscode/main/multipassmanager/media/features2.png" alt="SSH Functionality" />
</figure>



## Requirements

[Multipass](https://multipass.run/) downloaded on your computer.


## Known Issues

Do not spam commands. This may break the Multipass CLI thus breaking this extension. I am working on a queue for the commands currently to prevent this.

Currently working on implementing every command (especially choosing an image)

If you have an issue please open a request on the github. I am new to this so any feedback/advice/criticism is very appreicated!

## Q/A

Q: Why do the multipass instances take so long to load?
A: Multipass has to ssh into every instance in order to obtain their IP and information. If one of your instances is broken or if you have a large amount of instances this may feel like forever. In my experience the former is more common.

## Release Notes

### 1.0.0

First edition released! It may have unforseen bugs, let me know by creating an issue or PR

### 1.0.4

Changed the location of ssh keys. Instead of using the base id_rsa file in the .ssh folder, there is now a separate set of keys labelled multipass_id_rsa in the event you overwrite your base keys accidently. If you already created an instance using Vscode Remote SSH Setup through this extension, you should not be affected by this change, but note the ssh keys of your future instances are now stored in a different location.

Added "copy to clipboard" button when creating a Vscode Remote Server SSH Setup instance.

Labelled the Vscode Remote Server SSH Setup instance command as only Mac functionality, let me know if anyone wants Windows functionality, but I made this extension for Mac and use Multipass specifically for Mac workarounds.
