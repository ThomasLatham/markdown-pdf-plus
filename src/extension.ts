import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const manifest = fs.readFileSync(
  path.resolve(__dirname, "../package.json"),
  "utf8"
);
const meta = JSON.parse(manifest);

/**
 * The `activate()` function for this project is setup such that commands are automatically registered,
 * so long as:
 *
 * - There is an entry for the command in the manifest, and its `command`
 * 	attribute has the value "extension-name.command-name".
 *
 * </br>
 *
 * - There is a file in the `src/commands` directory named "command-name"
 * 	whose default export is the desired callback
 * 	to be used for the that command's `vscode.commands.registerCommand()`.
 *
 */
const activate = (context: vscode.ExtensionContext) => {
  // Loop through the commands in the manifest.
  context.subscriptions.push(
    ...meta.contributes.commands.map(
      async (commandObj: { command: string; title: string }) => {
        // Import the current command function from the `commands` directory
        const commandFunction = await import(
          `./commands/${commandObj.command.split(`${meta.name}.`)[1]}`
        );
        // Register the command
        return vscode.commands.registerCommand(
          commandObj.command,
          commandFunction.default
        );
      }
    )
  );
};

const deactivate = () => {};

export { activate, deactivate };
