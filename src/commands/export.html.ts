import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");

import UIMessages from "../constants/uiMessages";
import isMdDocument from "../util/general";

const exportHtml = async (isCalledFromExportResumePdf = false): Promise<boolean> => {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("markdown-resume-suite");

  // Get the input file
  const inputMarkdownHome = config.get("inputMarkdownHome", "");
  const inputMarkdownFilename = config.get("inputMarkdownFilename", "resmue.md");

  const inputMarkdownPath = path.join(inputMarkdownHome, inputMarkdownFilename);
  const inputMarkdownPathIsValid = fs.existsSync(inputMarkdownPath);

  let doc: vscode.TextDocument;

  if (inputMarkdownHome) {
    if (inputMarkdownPathIsValid) {
      vscode.window.showErrorMessage(UIMessages.invalidInputMarkdownPath);
      return false;
    }
    const inputFile = await vscode.workspace.openTextDocument(inputMarkdownPath);
    if (!isMdDocument(inputFile)) {
      vscode.window.showErrorMessage(UIMessages.invalidInputMarkdownFile);
      return false;
    }
    doc = inputFile;
    vscode.window.showTextDocument(doc, { preview: false });
  } else {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !isMdDocument(editor?.document)) {
      vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
      return false;
    }
    doc = editor.document;
  }

  if (doc.isDirty || doc.isUntitled) {
    doc.save();
  }

  if (!(await printToHtml())) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    return false;
  } else {
    if (!isCalledFromExportResumePdf) {
      vscode.window.showInformationMessage(UIMessages.exportToHtmlSucceeded);
    }
  }

  // Close the text editor if we opened it
  if (inputMarkdownHome && inputMarkdownPathIsValid) {
    vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }

  // Rename the file if user wants,
  // and move it if not calling from export PDF and user wants
  const outputFilename = config.get("outputFilename", path.parse(doc.fileName).name);

  const outputHome = config.get("outputHome", "");

  if (
    outputFilename !== path.parse(doc.fileName).name ||
    (outputHome && !isCalledFromExportResumePdf)
  ) {
    let renameDirectory: string;
    if (outputHome && !isCalledFromExportResumePdf) {
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
      fs.renameSync(doc.fileName, path.join(renameDirectory, outputFilename));
    } catch (error) {
      vscode.window.showErrorMessage(UIMessages.renamingOrMovingHtmlFailed);
      return false;
    }
  }

  return true;
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
