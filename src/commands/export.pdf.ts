import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
import puppeteer, { Page } from "puppeteer";
import { load } from "cheerio";

import UIMessages from "../constants/uiMessages";
import exportHtml from "./export.html";
import StylesheetInfo from "../interfaces/stylesheetInfo";
import { isMdDocument } from "../util/general";

const exportPdf = async (): Promise<boolean> => {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("markdown-pdf-plus");
  const [inputMarkdownFilename, inputHtmlFilename] = await exportHtml(true);

  if (inputHtmlFilename) {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !isMdDocument(editor?.document)) {
      vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
      return false;
    }
    const doc: vscode.TextDocument = editor.document;

    let inputHtmlHome = path.parse(doc.fileName).dir;
    if (!inputHtmlHome) {
      if (!vscode.window.activeTextEditor) {
        fs.unlink(inputHtmlFilename, () => {
          console.log("Temporary HTML file deleted.");
        });
        vscode.window.showErrorMessage(UIMessages.exportToPdfFailed);
        return false;
      } else {
        inputHtmlHome = path.parse(vscode.window.activeTextEditor.document.fileName).dir;
      }
    }

    const inputHtmlPath = path.join(inputHtmlHome, inputHtmlFilename);

    let outputPdfHome = config.get("outputHome", "");
    if (!outputPdfHome) {
      if (!vscode.window.activeTextEditor) {
        fs.unlink(inputHtmlPath, () => {
          console.log("Temporary HTML file deleted.");
        });
        vscode.window.showErrorMessage(UIMessages.exportToPdfFailed);
        return false;
      } else {
        outputPdfHome = path.parse(vscode.window.activeTextEditor.document.fileName).dir;
      }
    }
    const outputPdfFilename = `${config.get("outputFilename", "") || inputMarkdownFilename}.pdf`;

    const outputPdfPath = path.join(outputPdfHome, outputPdfFilename);

    if (await convertHtmlToPdf(inputHtmlPath, outputPdfPath)) {
      fs.unlink(inputHtmlPath, () => {
        console.log("Temporary HTML file deleted.");
      });
      vscode.window.showInformationMessage(UIMessages.exportToPdfSucceeded);
      return true;
    } else {
      fs.unlink(inputHtmlPath, () => {
        console.log("Temporary HTML file deleted.");
      });
      vscode.window.showErrorMessage(UIMessages.exportToPdfFailed);
      return false;
    }
  } else {
    return false;
  }
};

const convertHtmlToPdf = async (htmlFilePath: string, pdfFilePath: string): Promise<boolean> => {
  try {
    const config: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration("markdown-pdf-plus");

    const preferCSSPageSize: boolean = config.get("preferCSSPageSize", false);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Emulate screen media type to remove default header and footer
    await page.emulateMediaType("screen");

    // Set content of the page to the HTML file
    const htmlContent = replaceLocalImgSrcWithBase64(
      await fs.promises.readFile(htmlFilePath, "utf8")
    );
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await addExternalStylesheetsToPage(htmlFilePath, page);
    // Generate PDF without the header and footer
    await page.pdf({
      path: pdfFilePath,
      format: "A4",
      margin: { top: "96px", right: "96px", bottom: "96px", left: "96px" },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: preferCSSPageSize,
    });

    await browser.close();
    return true; // Conversion successful
  } catch (error) {
    console.error("Error converting HTML to PDF:", error);
    return false; // Conversion failed
  }
};

const addExternalStylesheetsToPage = async (htmlFilePath: string, page: Page): Promise<void> => {
  const fileContent = await fs.promises.readFile(htmlFilePath, "utf8");
  const stylesheets = extractStylesheetsFromHtml(fileContent, htmlFilePath);

  for (const stylesheet of stylesheets) {
    if (stylesheet.isExternal) {
      await page.addStyleTag({ url: stylesheet.path });
    } else {
      const stylesheetContent = await fs.promises.readFile(stylesheet.path, "utf8");
      await page.addStyleTag({ content: stylesheetContent });
    }
  }
};

const extractStylesheetsFromHtml = (
  htmlContent: string,
  htmlFilePath: string
): StylesheetInfo[] => {
  const $ = load(htmlContent);
  const stylesheets: StylesheetInfo[] = [];

  // eslint-disable-next-line quotes
  $('link[rel="stylesheet"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const isExternal = isExternalReference(href);
      const stylesheetPath = isExternal ? href : path.resolve(path.dirname(htmlFilePath), href);
      stylesheets.push({ path: stylesheetPath, isExternal });
    }
  });

  return stylesheets;
};

const replaceLocalImgSrcWithBase64 = (htmlContent: string): string => {
  const $ = load(htmlContent);

  $("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (src && !isExternalReference(src)) {
      const imagePath = path.resolve(src.replace("file:///", ""));
      const imageContent = fs.readFileSync(imagePath).toString("base64");
      const mimeType = getImageMimeType(imagePath);
      const dataUri = `data:${mimeType};base64,${imageContent}`;
      $(element).attr("src", dataUri);
    }
  });

  return $.html();
};

const getImageMimeType = (imagePath: string): string => {
  const extension = path.extname(imagePath).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/jpeg"; // Default to JPEG if the extension is unknown
  }
};

const isExternalReference = (reference: string): boolean => {
  return /^(https?:)?\/\//i.test(reference);
};

export default exportPdf;
