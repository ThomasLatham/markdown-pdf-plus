import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
import puppeteer, { Page } from "puppeteer";
import { load } from "cheerio";
import PCR from "puppeteer-chromium-resolver";
import crypto = require("crypto");

import UIMessages from "../constants/uiMessages";
import exportHtml from "./export.html";
import StylesheetInfo from "../interfaces/stylesheetInfo";
import { isMdDocument } from "../util/general";

let conditionalUIMessage = "";

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

      vscode.window.showInformationMessage(conditionalUIMessage);
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
  const tempHtmlFilePath = path.join(
    path.dirname(htmlFilePath),
    `${crypto.randomBytes(20).toString("hex")}.html`
  );

  try {
    const config: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration("markdown-pdf-plus");

    const preferCSSPageSize: boolean = config.get("usePageStyleFromCSS", false);
    const stats = await PCR({});

    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      executablePath: stats.executablePath,
    });
    const page = await browser.newPage();

    // Emulate screen media type to remove default header and footer
    await page.emulateMediaType("screen");

    const htmlContent = 
      // 4. add page style to the html content
      await injectPageStyle(
        // 3. replace local background images (CSS) with base64
        await replaceLocalBackgroundImagesWithBase64InMemory(
          // 2. replace local images (HTML) with base64
          replaceLocalImgSrcWithBase64(
            // 1. read the HTML content
            await fs.promises.readFile(htmlFilePath, "utf8")),
          htmlFilePath
        )
      );

    // Write the modified HTML content to a temporary file
    fs.writeFileSync(tempHtmlFilePath, htmlContent, "utf8");

    // Set content of the page to the temporary HTML file
    await page.goto(`file://${tempHtmlFilePath}`, { waitUntil: "networkidle0" });
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
  } finally {
    if (fs.existsSync(tempHtmlFilePath)) {
      fs.unlinkSync(tempHtmlFilePath);
      console.log("Temporary HTML file deleted.");
    }
  }
};

const addExternalStylesheetsToPage = async (htmlFilePath: string, page: Page): Promise<void> => {
  const fileContent = await fs.promises.readFile(htmlFilePath, "utf8");
  const stylesheets = extractStylesheetsFromHtml(fileContent, htmlFilePath);

  conditionalUIMessage = UIMessages.exportToPdfSucceeded;
  for (const stylesheet of stylesheets) {
    if (stylesheet.isExternal) {
      try {
        await page.addStyleTag({ url: stylesheet.path });
      } catch (error) {
        conditionalUIMessage = UIMessages.exportToPdfSucceededExternalCssFailed;
      }
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

const replaceLocalBackgroundImagesWithBase64InMemory = async (
  htmlContent: string,
  htmlFilePath: string
): Promise<string> => {
  const $ = load(htmlContent);

  // Process each linked CSS file
  const stylesheets = extractStylesheetsFromHtml(htmlContent, htmlFilePath);
  for (const stylesheet of stylesheets) {
    if (!stylesheet.isExternal) {
      const cssContent = await fs.promises.readFile(stylesheet.path, "utf8");
      const updatedCssContent = await replaceLocalUrlsWithBase64(
        cssContent,
        path.dirname(stylesheet.path)
      );

      // Inject the modified CSS content into the HTML
      $("head").append(`<style>${updatedCssContent}</style>`);
    }
  }

  return $.html();
};

const replaceLocalUrlsWithBase64 = async (cssContent: string, cssDir: string): Promise<string> => {
  return cssContent.replace(/url\(["']?(.*?)["']?\)/g, (match, url) => {
    if (!isExternalReference(url)) {
      const imagePath = path.resolve(cssDir, url);
      const imageContent = fs.readFileSync(imagePath).toString("base64");
      const mimeType = getImageMimeType(imagePath);
      const dataUri = `data:${mimeType};base64,${imageContent}`;
      return `url(${dataUri})`;
    }
    return match;
  });
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

/**
 * Injects page style into the HTML content.
 * @param htmlContent The HTML content to inject the page style into.
 * @returns The HTML content with the injected page style.
 */
const injectPageStyle = async (htmlContent: string): Promise<string> => {
  const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("markdown-pdf-plus");

  const marginTop = config.get("marginTop", "70px");
  const marginBottom = config.get("marginBottom", "70px");
  const marginLeft = config.get("marginLeft", "70px");
  const marginRight = config.get("marginRight", "70px");
  const pageSize = config.get("pageSize", "a4");

  let styleContent = "@page {";

  if (marginTop) styleContent += ` margin-top: ${marginTop};`;
  if (marginBottom) styleContent += ` margin-bottom: ${marginBottom};`;
  if (marginLeft) styleContent += ` margin-left: ${marginLeft};`;
  if (marginRight) styleContent += ` margin-right: ${marginRight};`;
  if (pageSize) styleContent += ` size: ${pageSize};`;

  styleContent += " }";

  const $ = load(htmlContent);
  $("head").append(`<style>${styleContent}</style>`);

  return $.html();
};

export default exportPdf;
