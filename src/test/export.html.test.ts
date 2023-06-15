/* eslint-disable @typescript-eslint/no-empty-function */
import should from "should";
import * as sinon from "sinon";
import { SinonSpy } from "sinon";
import * as vscode from "vscode";
import { extensions, ExtensionContext, SnippetString, Extension } from "vscode";
import path from "path";

import exportHtml from "../commands/export.html";
import UIMessages from "../constants/uiMessages";
import { cloneExtensionSettings, withRandomFileEditor } from "./util/general";
import { getAbsolutePath } from "../util/general";

describe("export.html", async function () {
  const mrsSettings = vscode.workspace.getConfiguration("markdown-pdf-plus");
  const sandbox = sinon.createSandbox();
  let preTestSettings: SettingObject[];

  let showErrorMessageSpy: SinonSpy;
  let showTextDocumentSpy: SinonSpy;

  let extensionContext: ExtensionContext;

  this.beforeAll(async function () {
    // save the current global settings for the extension because we're about to change them
    const extension = extensions.getExtension("tom-latham.markdown-pdf-plus");

    extensionContext = await extension?.activate();
    preTestSettings = cloneExtensionSettings(extension as Extension<any>, mrsSettings);
  });

  beforeEach(function () {
    showErrorMessageSpy = sandbox.spy(vscode.window, "showErrorMessage");
    showTextDocumentSpy = sandbox.spy(vscode.window, "showTextDocument");
  });

  afterEach(function () {
    sandbox.restore();
  });

  this.afterAll(function () {
    // revert the global settings back to how they were before we started testing
    preTestSettings.forEach((setting) => {
      mrsSettings.update(setting.settingName, setting.settingValue, true);
    });
  });

  describe("exportHtml", function () {
    context("when user is using a custom input path", function () {
      context("when the path is not valid", function () {
        beforeEach(async function () {
          await mrsSettings.update("inputMarkdownHome", "some/invalid/path", true);
        });

        it("tells the user the path is invalid and aborts", async function () {
          const result = await exportHtml();
          sandbox.assert.calledWith(showErrorMessageSpy, UIMessages.invalidInputMarkdownPath);
          should(result).deepEqual(["", ""]);
        });
      });
      context("when the opened file is not Markdown", function () {
        beforeEach(async function () {
          await mrsSettings.update(
            "inputMarkdownHome",
            getAbsolutePath("src/test/mocks", extensionContext),
            true
          );
          await mrsSettings.update("inputMarkdownFilename", "resume.mock.txt", true);
        });

        it("tells the user the file type is invalid and aborts", async function () {
          const result = await exportHtml();
          sandbox.assert.calledWith(showErrorMessageSpy, UIMessages.invalidInputMarkdownFile);
          should(result).deepEqual(["", ""]);
        });
      });
      context("when the opened file is Markdown", function () {
        beforeEach(async function () {
          await mrsSettings.update(
            "inputMarkdownHome",
            getAbsolutePath("src/test/mocks", extensionContext),
            true
          );
          await mrsSettings.update("inputMarkdownFilename", "resume.mock.md", true);
        });
        it("opens the file in a new editor", async function () {
          await exportHtml();
          const inputFile = await vscode.workspace.openTextDocument(
            path.resolve(getAbsolutePath("src/test/mocks", extensionContext), "resume.mock.md")
          );
          sandbox.assert.calledWith(showTextDocumentSpy, inputFile, { preview: false });
        });
      });
    });
    context("when the user is not using a custom input path", function () {
      beforeEach(async function () {
        await mrsSettings.update("inputMarkdownHome", "", true);
        await mrsSettings.update("inputMarkdownFilename", "", true);
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      });
      context("when there is no open editor", function () {
        it("tells the user there is no valid Markdown file and aborts", async function () {
          const result = await exportHtml();
          sandbox.assert.calledWith(showErrorMessageSpy, UIMessages.noValidMarkdownFile);
          should(result).deepEqual(["", ""]);
        });
      });
      context("when the open editor is not Markdown", function () {
        it("tells the user there is no valid Markdown file and aborts", async function () {
          await withRandomFileEditor(
            "",
            async (editor) => {
              await editor.insertSnippet(new SnippetString());
              const result = await exportHtml();
              sandbox.assert.calledWith(showErrorMessageSpy, UIMessages.noValidMarkdownFile);
              should(result).deepEqual(["", ""]);
            },
            ".txt"
          );
        });
      });
    });
  });

  // context("when it fails to export the Markdown file to HTML", function () {
  //   xit("informs the user of the same", function () {});
  // });

  // context("when it succeeds in exporting the Markdown file to HTML", function () {
  //   it("informs the user of the same", function () {});

  //   context("when a new editor was opened to export HTML", function () {
  //     it("closes that editor", function () {});
  //   });

  //   context("when the user wants the file renamed", function () {
  //     it("renames the file", function () {});
  //   });

  //   context(
  //     "when the user wants the file moved, " +
  //       "and exporting to HTML isn't intermediary to exporting to another file format",
  //     function () {
  //       it("moves the exported resume", function () {});
  //     }
  //   );
  // });
});
