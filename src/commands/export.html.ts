import * as vscode from "vscode";
import * as fs from "fs";

import UIMessages from "../constants/uiMessages";
import isMdDocument from "../util/general";
import path = require("path");

const exportResumeHtml = async (
  isCalledFromExportResumePdf: boolean = false
) => {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("markdown-resume-suite");

  // Get the input file
  const inputMarkdownHome = config.get("inputMarkdownHome", "");
  const inputMarkdownFilename = config.get(
    "inputMarkdownFilename",
    "resmue.md"
  );

  const inputMarkdownPath = path.join(inputMarkdownHome, inputMarkdownFilename);
  const inputMarkdownPathIsValid = fs.existsSync(inputMarkdownPath);
  const userIsUsingCustomInputPath = inputMarkdownHome.length > 0;

  let doc: vscode.TextDocument;

  if (
    (userIsUsingCustomInputPath && !inputMarkdownPathIsValid) ||
    !userIsUsingCustomInputPath
  ) {
    if (userIsUsingCustomInputPath) {
      vscode.window.showWarningMessage(UIMessages.invalidInputMarkdownPath);
    }

    const editor = vscode.window.activeTextEditor;

    if (!editor || !isMdDocument(editor?.document)) {
      vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
      return;
    }

    doc = editor.document;
  } else {
    const inputFile = await vscode.workspace.openTextDocument(
      inputMarkdownPath
    );
    if (!isMdDocument(inputFile)) {
      vscode.window.showErrorMessage(UIMessages.invalidInputMarkdownFile);
      return;
    } else {
      doc = inputFile;
      vscode.window.showTextDocument(doc, { preview: false });
    }
  }

  if (doc.isDirty || doc.isUntitled) {
    doc.save();
  }

  printToHtml();

  // Close the text editor
  if (userIsUsingCustomInputPath) {
    //close the editor
  }

  // Move the output file if necessary and not calling from pdf
};

const printToHtml = () => {
  const markdownAllInOne = vscode.extensions.getExtension(
    "markdown-all-in-one"
  );

  // is the ext loaded and ready?
  if (markdownAllInOne?.isActive == false) {
    markdownAllInOne.activate().then(
      function () {
        console.log("Extension activated");
        vscode.commands.executeCommand("markdown.extension.printToHtml");
      },
      function () {
        console.log("Extension activation failed");
      }
    );
  } else {
    vscode.commands.executeCommand("markdown.extension.printToHtml");
  }
};

export default exportResumeHtml;
