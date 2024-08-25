import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
import crypto = require("crypto");
import os from "os";

import UIMessages from "../constants/uiMessages";
import { isMdDocument, convertFileExtension } from "../util/general";
import { checkFileExists } from "../test/util/general";

interface IExportHtmlReturn {
  sourceMarkdownFilename: string;
  createdHtmlFilename: string;
  createdHtmlPath: string;
  afterPuppeteerStartsCallback?: () => void;
}

/**
 * Exports the current Markdown document (whether by current editor or configured path) to HTML.
 *
 * @param isCalledFromExportPdf True if the function was called from `exportPdf()`
 *  in`src/commands/export.pdf.ts`.
 * @returns If unsuccessful, an empty object.
 *  If successful, an object with the source Markdown filename, the created HTML filename
 * and the path to the created HTML file.
 */
const exportHtml = async (isCalledFromExportPdf = false): Promise<IExportHtmlReturn> => {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("markdown-pdf-plus");

  const editor = vscode.window.activeTextEditor;

  if (!editor || !isMdDocument(editor?.document)) {
    vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
    return {} as IExportHtmlReturn;
  }
  const doc: vscode.TextDocument = editor.document;

  if (doc.isDirty || doc.isUntitled) {
    doc.save();
  }

  // if the HTML already exists and we're calling this to export a PDF,
  // make a copy of the HTML with a random name so
  // that it doesn't get overwritten by printToHtml
  const tempHtmlFilePath =
    (await checkFileExists(convertFileExtension(doc.fileName, ".md", ".html"), 6000)) &&
    isCalledFromExportPdf
      ? convertFileExtension(doc.fileName, ".md", ".html") + ".tmp"
      : "";
  if (tempHtmlFilePath) {
    const htmlFilePath = convertFileExtension(doc.fileName, ".md", ".html");
    fs.copyFileSync(htmlFilePath, tempHtmlFilePath);
  }

  if (!(await printToHtml())) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    return {} as IExportHtmlReturn;
  }

  if (
    isCalledFromExportPdf &&
    !(await checkFileExists(convertFileExtension(doc.fileName, ".md", ".html"), 6000))
  ) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    return {} as IExportHtmlReturn;
  }

  try {
    // Read the generated HTML file
    const htmlFilePath = convertFileExtension(doc.fileName, ".md", ".html");
    if (!fs.existsSync(htmlFilePath)) {
      // just wait a while
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
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

    // Write the modified HTML content back to the file
    fs.writeFileSync(htmlFilePath, htmlContent);
  } catch (error) {
    vscode.window.showErrorMessage(UIMessages.exportToHtmlFailed);
    console.error("Error modifying HTML content:", error);
    return {} as IExportHtmlReturn;
  }

  if (!isCalledFromExportPdf) {
    vscode.window.showInformationMessage(UIMessages.exportToHtmlSucceeded);
  }

  // Rename the file if user wants or if calling from export PDF,
  // and move it if not calling from export PDF and user wants
  const outputFilename = isCalledFromExportPdf
    ? crypto.randomBytes(20).toString("hex")
    : config.get("outputFilename", "") || path.parse(doc.fileName).name;

  // make a temporary folder for the HTML file if we're calling this from exportPdf
  const outputHome = isCalledFromExportPdf
    ? fs.mkdtempSync(path.join(os.tmpdir(), "markdown-pdf-plus-"))
    : config.get("outputHome", "");

  if (outputFilename !== path.parse(doc.fileName).name || (outputHome && !isCalledFromExportPdf)) {
    let renameDirectory: string;
    if (outputHome) {
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
      // if rename directory is not path.parse(doc.fileName).dir,
      // then we also need to copy all the assets to the new directory.
      // we need to do this by parsing the HTML file and copying all assets
      // referenced in ANY local paths to the new directory.
      // further, if any of the assets is a CSS file,
      // we need to check if it has any local paths and copy those as well.
      if (renameDirectory != path.parse(doc.fileName).dir) {
        const htmlFilePath = convertFileExtension(doc.fileName, ".md", ".html");
        const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");
        const assetRegex = /(?:src|href)="(.*?)"|url\((.*?)\)/g;
        let match: RegExpExecArray | null;
        while ((match = assetRegex.exec(htmlContent))) {
          const assetPath = match[1] || match[2];
          if (assetPath && !assetPath.startsWith("http")) {
            // Resolve asset path relative to the HTML file's directory
            const assetFullPath = path.resolve(path.dirname(htmlFilePath), assetPath);
            if (fs.existsSync(assetFullPath)) {
              // Check for CSS to handle CSS assets
              if (path.extname(assetFullPath) == ".css") {
                const cssContent = fs.readFileSync(assetFullPath, "utf-8");
                const cssAssetRegex = /url\(['"]?(.*?)['"]?\)/g; // Updated regex to capture optional quotes
                let cssMatch: RegExpExecArray | null;
                while ((cssMatch = cssAssetRegex.exec(cssContent))) {
                  let cssAssetPath = cssMatch[1];
                  if (cssAssetPath && !cssAssetPath.startsWith("http")) {
                    // Trim quotes and normalize the path
                    cssAssetPath = cssAssetPath.replace(/['"]/g, ""); // Remove quotes
                    const cssAssetFullPath = path.resolve(
                      path.dirname(assetFullPath),
                      cssAssetPath
                    );
                    const normalizedCssAssetFullPath = path.normalize(cssAssetFullPath); // Normalize the path
                    if (fs.existsSync(normalizedCssAssetFullPath)) {
                      fs.copyFileSync(
                        normalizedCssAssetFullPath,
                        path.join(renameDirectory, path.basename(normalizedCssAssetFullPath))
                      );
                    }
                  }
                }
              }
              fs.copyFileSync(
                assetFullPath,
                path.join(renameDirectory, path.basename(assetFullPath))
              );
            }
          }
        }
      }
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
      return {} as IExportHtmlReturn;
    }
  }

  return {
    sourceMarkdownFilename: path.parse(doc.fileName).name,
    createdHtmlFilename: `${outputFilename}.html`,
    createdHtmlPath: outputHome,
    // If we created a temporary HTML file,
    // rename the temporary file to the original name
    afterPuppeteerStartsCallback: () =>
      fs.renameSync(tempHtmlFilePath, convertFileExtension(doc.fileName, ".md", ".html")),
  };
};

const printToHtml = async (): Promise<boolean> => {
  const markdownAllInOne = vscode.extensions.getExtension("markdown-all-in-one");

  // is the ext loaded and ready?
  if (markdownAllInOne?.isActive == false) {
    await markdownAllInOne.activate();
    console.log("Extension activated");
  }
  return vscode.commands.executeCommand("markdown.extension.printToHtml").then(
    () => {
      return true;
    },
    () => {
      return false;
    }
  );
};

const convertMermaidBlocks = (html: string): string => {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (match, p1) => {
      return `<pre class="mermaid">${p1}</pre>`;
    }
  );
};

export { IExportHtmlReturn };
export default exportHtml;
