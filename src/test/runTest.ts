import * as fs from "fs";
import * as path from "path";
import { runTests } from "@vscode/test-electron";

/**
 * Runs the integration tests in a downloaded copy of VS Code, with no other extensions installed
 * and the test fixtures open as the workspace.
 */
async function main() {
  try {
    const root = path.resolve(__dirname, "../../");
    const version = process.env.VSCODE_TEST_VERSION ?? "stable";
    const testDir = path.join(root, ".vscode-test");
    const extensionsDir = path.join(testDir, "extensions-empty");
    fs.mkdirSync(extensionsDir, { recursive: true });

    await runTests({
      version,
      cachePath: testDir,
      extensionDevelopmentPath: root,
      extensionTestsPath: path.resolve(__dirname, "./integration/index"),
      launchArgs: [
        path.join(root, "src", "test", "fixtures"),
        "--extensions-dir",
        extensionsDir,
        // Kept short: Windows can't load VS Code from deeply nested paths. One per version, since
        // older versions can't always open a profile written by newer ones.
        "--user-data-dir",
        path.join(testDir, `ud-${version}`),
        "--disable-workspace-trust",
        "--skip-welcome",
        "--skip-release-notes",
      ],
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

main();
