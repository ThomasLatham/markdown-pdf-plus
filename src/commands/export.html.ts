import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
import crypto = require("crypto");

import UIMessages from "../constants/uiMessages";
import { isMdDocument, convertFileExtension } from "../util/general";
import { checkFileExists } from "../test/util/general";

/**
 * Exports the current Markdown document (whether by current editor or configured path) to HTML.
 *
 * @param isCalledFromExportPdf True if the function was called from `exportPdf()`
 *  in`src/commands/export.pdf.ts`.
 * @returns If successful, the name of the created file. Otherwise, the empty string.
 */
const exportHtml = async (isCalledFromExportPdf = false): Promise<string> => {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("markdown-pdf-plus");

  // Get the input file
  const inputMarkdownHome = config.get("inputMarkdownHome", "");
  const inputMarkdownFilename = config.get("inputMarkdownFilename", "");

  const inputMarkdownPath = path.join(inputMarkdownHome, inputMarkdownFilename);
  const inputMarkdownPathIsValid = fs.existsSync(inputMarkdownPath);

  let doc: vscode.TextDocument;

  if (inputMarkdownHome) {
    if (!inputMarkdownPathIsValid) {
      vscode.window.showErrorMessage(UIMessages.invalidInputMarkdownPath);
      return "";
    }
    const inputFile = await vscode.workspace.openTextDocument(inputMarkdownPath);
    if (!isMdDocument(inputFile)) {
      vscode.window.showErrorMessage(UIMessages.invalidInputMarkdownFile);
      return "";
    }
    doc = inputFile;
    vscode.window.showTextDocument(doc, { preview: false });
  } else {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !isMdDocument(editor?.document)) {
      vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
      return "";
    }
    doc = editor.document;
  }

  if (doc.isDirty || doc.isUntitled) {
    doc.save();
  }

  if (!(await printToHtml())) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    return "";
  } else {
    if (!isCalledFromExportPdf) {
      vscode.window.showInformationMessage(UIMessages.exportToHtmlSucceeded);
    }
  }

  if (
    !(await checkFileExists(convertFileExtension(doc.fileName, ".md", ".html"), 6000)) &&
    isCalledFromExportPdf
  ) {
    vscode.window.showErrorMessage(UIMessages.exportToPdfFailed);
    return "";
  }
  // Close the text editor if we opened it
  if (inputMarkdownHome && inputMarkdownPathIsValid) {
    vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }

  // Rename the file if user wants or if calling from export PDF,
  // and move it if not calling from export PDF and user wants
  const outputFilename = isCalledFromExportPdf
    ? crypto.randomBytes(20).toString("hex")
    : config.get("outputFilename", "") || "output";
  const outputHome = config.get("outputHome", "");

  if (outputFilename !== path.parse(doc.fileName).name || (outputHome && !isCalledFromExportPdf)) {
    let renameDirectory: string;
    if (outputHome && !isCalledFromExportPdf) {
      if (!fs.existsSync(outputHome)) {
        {
          fs.mkdirSync(outputHome, { recursive: true });
        }
      }
      renameDirectory = outputHome;
    } else {
      renameDirectory = path.parse(doc.fileName).dir;
    }

    try {
      fs.renameSync(
        convertFileExtension(doc.fileName, ".md", ".html"),
        path.join(renameDirectory, `${outputFilename}.html`)
      );
    } catch (error) {
      if (isCalledFromExportPdf) {
        fs.unlink(convertFileExtension(doc.fileName, ".md", ".html"), () => {
          console.log("Temporary HTML file deleted.");
        });
      }
      vscode.window.showErrorMessage(UIMessages.renamingOrMovingHtmlFailed);
      return "";
    }
  }
  return `${outputFilename}.html`;
};

const printToHtml = async (): Promise<boolean> => {
  const markdownAllInOne = vscode.extensions.getExtension("markdown-all-in-one");

  // is the ext loaded and ready?
  if (markdownAllInOne?.isActive == false) {
    return markdownAllInOne.activate().then(
      function () {
        console.log("Extension activated");
        return vscode.commands.executeCommand("markdown.extension.printToHtml").then(
          () => {
            return true;
          },
          () => {
            return false;
          }
        );
      },
      function () {
        console.log("Extension activation failed");
        return false;
      }
    );
  } else {
    return vscode.commands.executeCommand("markdown.extension.printToHtml").then(
      () => {
        return true;
      },
      () => {
        return false;
      }
    );
  }
};

export default exportHtml;
