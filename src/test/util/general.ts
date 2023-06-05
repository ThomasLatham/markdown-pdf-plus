/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import * as vscode from "vscode";
import * as crypto from "crypto";

import { TestFS } from "./memfs";

export const testFs = new TestFS("fake-fs", true);
vscode.workspace.registerFileSystemProvider(testFs.scheme, testFs, {
  isCaseSensitive: testFs.isCaseSensitive,
});

export function rndName() {
  return crypto.randomBytes(8).toString("hex");
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
