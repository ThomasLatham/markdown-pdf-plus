import * as assert from "assert";
import * as vscode from "vscode";
import {
  TextDocument,
  TextEditor,
  Extension,
  window,
  workspace,
  WorkspaceConfiguration,
} from "vscode";
import * as crypto from "crypto";
import { promises as fs } from "fs";

import { TestFS } from "./memfs";
import SettingsCategory from "../interfaces/settingsCategory";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const testFs = new TestFS("fake-fs", true);
vscode.workspace.registerFileSystemProvider(testFs.scheme, testFs, {
  isCaseSensitive: testFs.isCaseSensitive,
});

export function rndName() {
  return crypto.randomBytes(8).toString("hex");
}

export async function deleteFile(file: vscode.Uri): Promise<boolean> {
  try {
    testFs.delete(file);
    return true;
  } catch {
    return false;
  }
}

export async function createRandomFile(
  contents = "",
  dir: vscode.Uri | undefined = undefined,
  ext = ""
): Promise<vscode.Uri> {
  let fakeFile: vscode.Uri;
  if (dir) {
    assert.strictEqual(dir.scheme, testFs.scheme);
    fakeFile = dir.with({ path: dir.path + "/" + rndName() + ext });
  } else {
    fakeFile = vscode.Uri.parse(`${testFs.scheme}:/${rndName() + ext}`);
  }
  testFs.writeFile(fakeFile, Buffer.from(contents), { create: true, overwrite: true });
  return fakeFile;
}

export function withRandomFileEditor(
  initialContents: string,
  run: (editor: TextEditor, doc: TextDocument) => Thenable<void>,
  ext?: string
): Thenable<boolean> {
  return createRandomFile(initialContents, undefined, ext).then((file) => {
    return workspace.openTextDocument(file).then((doc) => {
      return window.showTextDocument(doc).then((editor) => {
        return run(editor, doc).then((_) => {
          if (doc.isDirty) {
            return doc.save().then((saved) => {
              assert.ok(saved);
              assert.ok(!doc.isDirty);
              return deleteFile(file);
            });
          } else {
            return deleteFile(file);
          }
        });
      });
    });
  });
}

/*-------------------------------------------------------------------
 *  End Microsoft code.
 *-------------------------------------------------------------------*/

/**
 * Returns a copy of the user settings for the given extension.
 *
 * @param extension The instance of the extension for which to get a user's settings.
 * @param config The current settings configuration for the given extension.
 */
const cloneExtensionSettings = (
  extension: Extension<any>,
  config: WorkspaceConfiguration
): SettingObject[] => {
  return getSettingNamesFromConfig(extension.packageJSON.contributes.configuration).map(
    (settingName) => {
      return {
        settingName: settingName,
        settingValue: config.inspect(settingName.split("markdown-pdf-plus.")[1])
          ?.globalValue as string,
      };
    }
  );
};

const getSettingNamesFromConfig = (arr: SettingsCategory[]): string[] => {
  const keys: string[] = [];

  for (const item of arr) {
    for (const key in item.properties) {
      keys.push(key);
    }
  }

  return keys;
};

const checkFileExists = async (path: string, timeout: number): Promise<boolean> => {
  const startTime = Date.now();
  const endTime = startTime + timeout;

  while (Date.now() < endTime) {
    try {
      await fs.access(path); // Check if the file exists
      return true; // File found, return true
    } catch (error) {
      // File doesn't exist yet, wait for a short interval
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return false; // File not found within the timeout
};

export { checkFileExists, cloneExtensionSettings };
