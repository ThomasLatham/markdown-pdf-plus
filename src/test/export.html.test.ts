/* eslint-disable @typescript-eslint/no-empty-function */
import should from "should";
import * as sinon from "sinon";
import { SinonSpy } from "sinon";
import * as vscode from "vscode";

import exportHtml from "../commands/export.html";
import UIMessages from "../constants/uiMessages";

describe("export.html", async function () {
  const mrsSettings = vscode.workspace.getConfiguration("markdown-resume-suite");
  const sandbox = sinon.createSandbox();
  let showErrorMessageSpy: SinonSpy;
  let showInformationMessageSpy: SinonSpy;

  beforeEach(function () {
    showErrorMessageSpy = sandbox.spy(vscode.window, "showErrorMessage");
    showInformationMessageSpy = sandbox.spy(vscode.window, "showInformationMessage");
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("exportHtml", function () {
    context("when user is using a custom input path and the path is not valid", function () {
      beforeEach(async function () {
        await mrsSettings.update("inputMarkdownHome", "some/invalid/path", true);
      });

      it("tells the user the path is invalid and aborts", function () {
        exportHtml().then((result) => {
          sandbox.assert.calledWith(showErrorMessageSpy, UIMessages.invalidInputMarkdownPath);
          should(result).not.be.ok();
        });
      });
    });

    context(
      "when there is no open editor or the file in the currently open editor is not Markdown",
      function () {
        it("aborts", function () {
          exportHtml().then((result) => {
            should(result).not.be.ok();
          });
        });
      }
    );
  });
  context("when the user is using a valid custom input path", function () {
    context("when the file at the valid input path is not Markdown", function () {
      it("tells the user the input file is not Markdown and returns", function () {});
    });
    context("when the file at the valid input path is Markdown", function () {
      it("opens the file in a new editor", function () {});
    });
  });

  context("when it fails to export the Markdown file to HTML", function () {
    xit("informs the user of the same", function () {});
  });

  context("when it succeeds in exporting the Markdown file to HTML", function () {
    it("informs the user of the same", function () {});

    context("when a new editor was opened to export HTML", function () {
      it("closes that editor", function () {});
    });

    context("when the user wants the file renamed", function () {
      it("renames the file", function () {});
    });

    context(
      "when the user wants the file moved, " +
        "and exporting to HTML isn't intermediary to exporting to another file format",
      function () {
        it("moves the exported resume", function () {});
      }
    );
  });
});
