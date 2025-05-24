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
 * @returns A 2-element `string` array. If unsuccessful, both strings will be the empty string.
 *  If successful, the first string will be the name of the original input file, and second string
 *  will be the name of the created HTML file.
 */
const exportHtml = async (isCalledFromExportPdf = false): Promise<[string, string]> => {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("markdown-pdf-plus");

  const editor = vscode.window.activeTextEditor;

  if (!editor || !isMdDocument(editor?.document)) {
    vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
    return ["", ""];
  }
  const doc: vscode.TextDocument = editor.document;

  if (doc.isDirty || doc.isUntitled) {
    doc.save();
  }

  if (!(await printToHtml())) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    return ["", ""];
  }

  if (
    !(await checkFileExists(convertFileExtension(doc.fileName, ".md", ".html"), 6000)) &&
    isCalledFromExportPdf
  ) {
    vscode.window.showErrorMessage(UIMessages.exportToPdfFailed);
    return ["", ""];
  }

  try {
    // Read the generated HTML file
    const htmlFilePath = convertFileExtension(doc.fileName, ".md", ".html");
    let htmlContent = fs.readFileSync(htmlFilePath, "utf-8");

    // Modify the HTML content to render Mermaid diagrams as SVGs
    const mermaidScript = `
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true });
    </script>`;

    // Insert the Mermaid script after the first instance of </style>
    const styleIndex = htmlContent.indexOf("</style>");
    if (styleIndex !== -1) {
      htmlContent =
        htmlContent.slice(0, styleIndex + 8) + mermaidScript + htmlContent.slice(styleIndex + 8);
    } else {
      // If no </style> tag is found, append the script at the end of the HTML
      htmlContent += mermaidScript;
    }

    // convert mermaid blocks
    htmlContent = convertMermaidBlocks(htmlContent);

    // Add the extension-setting CSS to the HTML content
    const stylesheetPathFromExtensionSettings = config.get("CSSPath", "");
    if (stylesheetPathFromExtensionSettings && fs.existsSync(stylesheetPathFromExtensionSettings)) {
      const stylesheetContent = fs.readFileSync(stylesheetPathFromExtensionSettings, "utf-8");
      const styleTag = `<style>${stylesheetContent}</style>`;
      htmlContent += styleTag;
    }

    const rawStylesFromExtensionSettings = config.get("CSSRaw", "");
    if (rawStylesFromExtensionSettings) {
      const styleTag = `<style>${rawStylesFromExtensionSettings}</style>`;
      htmlContent += styleTag;
    }

    // Write the modified HTML content back to the file
    fs.writeFileSync(htmlFilePath, htmlContent);
  } catch (error) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    console.error("Error modifying HTML content:", error);
    return ["", ""];
  }

  if (!isCalledFromExportPdf) {
    vscode.window.showInformationMessage(UIMessages.exportToHtmlSucceeded);
  }

  // Rename the file if user wants or if calling from export PDF,
  // and move it if not calling from export PDF and user wants
  const outputFilename = isCalledFromExportPdf
    ? crypto.randomBytes(20).toString("hex")
    : config.get("outputFilename", "") || path.parse(doc.fileName).name;
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
      return ["", ""];
    }
  }
  return [path.parse(doc.fileName).name, `${outputFilename}.html`];
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

const convertMermaidBlocks = (html: string): string => {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (match, p1) => {
      return `<pre class="mermaid">${p1}</pre>`;
    }
  );
};

export default exportHtml;
