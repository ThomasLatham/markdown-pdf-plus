import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import UIMessages from "../constants/uiMessages";
import { PathContext, resolveOutputPath } from "../lib/paths";
import { BrowserUnavailableError } from "../pdf/browser";
import { renderInBrowser } from "../pdf/render";
import { buildHtmlDocument, ExportFormat } from "./document";
import { ExportSettings, getSettings } from "./settings";

export interface ExportServices {
  context: vscode.ExtensionContext;
  log: vscode.LogOutputChannel;
}

/**
 * Exports a Markdown document to HTML or PDF.
 *
 * @param resource The Markdown file to export. Defaults to the one in the active editor.
 * @returns The path of the exported file, or `undefined` if nothing was exported.
 */
export const exportMarkdown = async (
  services: ExportServices,
  format: ExportFormat,
  resource?: vscode.Uri
): Promise<string | undefined> => {
  const { context, log } = services;
  const label = format.toUpperCase();

  const doc = await getMarkdownDocument(resource);
  if (!doc) {
    vscode.window.showErrorMessage(UIMessages.noValidMarkdownFile);
    return undefined;
  }

  const settings = getSettings(doc.uri);
  const pathContext = getPathContext(doc);
  const outputPath = await getOutputPath(doc, format, settings, pathContext);
  if (!outputPath) {
    return undefined;
  }

  const warnings: string[] = [];
  const warn = (message: string) => {
    if (!warnings.includes(message)) {
      warnings.push(message);
      log.warn(message);
    }
  };

  const started = Date.now();
  const phases: string[] = [];
  let phaseStart = started;
  const mark = (phase: string) => {
    const now = Date.now();
    phases.push(`${phase} ${now - phaseStart} ms`);
    phaseStart = now;
  };

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Exporting ${path.basename(doc.fileName)} to ${label}…`,
      },
      async () => {
        const { $, mermaidCount } = await buildHtmlDocument({
          doc,
          format,
          outputPath,
          settings,
          pathContext,
          warn,
        });
        mark("markdown");
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

        const renderOptions = {
          browser: {
            executablePath: settings.executablePath,
            storageDir: context.globalStorageUri.fsPath,
            log: (message: string) => log.info(message),
          },
          mermaidScriptPath: context.asAbsolutePath(path.join("dist", "media", "mermaid.min.js")),
          mermaidTheme: settings.mermaidTheme,
          warn,
          mark,
        };

        if (format === "pdf") {
          await renderInBrowser($.html(), {
            ...renderOptions,
            renderMermaid: mermaidCount > 0,
            reportFailedRequests: true,
            pdfPath: outputPath,
          });
          return;
        }

        // HTML exports only need a browser to turn Mermaid diagrams into static SVGs.
        if (mermaidCount > 0) {
          const { mermaidDiagrams } = await renderInBrowser($.html(), {
            ...renderOptions,
            renderMermaid: true,
            reportFailedRequests: false,
          });
          $(".mermaid-diagram").each((i, element) => {
            if (mermaidDiagrams[i] !== undefined) {
              $(element).html(mermaidDiagrams[i]);
            }
          });
        }
        await fs.promises.writeFile(outputPath, $.html(), "utf8");
      }
    );
  } catch (error) {
    if (error instanceof BrowserUnavailableError) {
      return undefined;
    }
    log.error(`Exporting ${doc.fileName} to ${label} failed:`, error as Error);
    vscode.window
      .showErrorMessage(
        `Exporting to ${label} failed: ${describeError(error, outputPath)}`,
        UIMessages.showLog
      )
      .then((choice) => choice === UIMessages.showLog && log.show());
    return undefined;
  }

  log.info(
    `Exported ${doc.fileName} to ${outputPath} in ${Date.now() - started} ms (${phases.join(", ")})`
  );
  showResult(outputPath, warnings);
  return outputPath;
};

/**
 * The document to export: the given file, else the active editor, else (e.g. when the Markdown
 * preview has focus) the only visible Markdown editor.
 */
const getMarkdownDocument = async (
  resource?: vscode.Uri
): Promise<vscode.TextDocument | undefined> => {
  if (resource) {
    const doc = await vscode.workspace.openTextDocument(resource);
    return isMarkdown(doc) ? doc : undefined;
  }

  const active = vscode.window.activeTextEditor?.document;
  if (active) {
    return isMarkdown(active) ? active : undefined;
  }

  const visible = vscode.window.visibleTextEditors.filter((e) => isMarkdown(e.document));
  return visible.length === 1 ? visible[0].document : undefined;
};

const isMarkdown = (doc: vscode.TextDocument): boolean => {
  if (doc.languageId === "markdown") {
    return true;
  }
  // Markdown All in One lets users treat other languages (e.g. "rmd", "quarto") as Markdown.
  const extraLangIds = vscode.workspace
    .getConfiguration("markdown.extension")
    .get<string[]>("extraLangIds", []);
  return extraLangIds.includes(doc.languageId);
};

const getPathContext = (doc: vscode.TextDocument): PathContext => {
  const isFile = doc.uri.scheme === "file" && !doc.isUntitled;
  const workspaceFolder =
    vscode.workspace.getWorkspaceFolder(doc.uri) ?? vscode.workspace.workspaceFolders?.[0];
  return {
    fileDir: isFile ? path.dirname(doc.uri.fsPath) : undefined,
    workspaceFolder:
      workspaceFolder?.uri.scheme === "file" ? workspaceFolder.uri.fsPath : undefined,
  };
};

const getOutputPath = async (
  doc: vscode.TextDocument,
  format: ExportFormat,
  settings: ExportSettings,
  pathContext: PathContext
): Promise<string | undefined> => {
  const isFile = doc.uri.scheme === "file" && !doc.isUntitled;
  if (isFile || settings.outputHome.trim()) {
    return resolveOutputPath({
      sourcePath: isFile ? doc.uri.fsPath : doc.fileName,
      outputHome: settings.outputHome,
      outputFilename: settings.outputFilename,
      extension: format,
      context: pathContext,
    });
  }

  // An unsaved document has no folder to export next to, so ask where to put it.
  const defaultName = resolveOutputPath({
    sourcePath: path.join(pathContext.workspaceFolder ?? "", path.basename(doc.fileName)),
    outputHome: "",
    outputFilename: settings.outputFilename,
    extension: format,
    context: pathContext,
  });
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultName),
    filters: { [format.toUpperCase()]: [format] },
  });
  return target?.fsPath;
};

const describeError = (error: unknown, outputPath: string): string => {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "EBUSY" || code === "EPERM" || code === "EACCES") {
    return `couldn't write ${outputPath}. Is it open in another program?`;
  }
  return (error as Error)?.message ?? String(error);
};

const showResult = (outputPath: string, warnings: string[]): void => {
  const name = path.basename(outputPath);
  const message = warnings.length
    ? `Exported ${name}, with warnings: ${warnings.join(" ")}`
    : `Exported ${name}.`;
  const show = warnings.length
    ? vscode.window.showWarningMessage
    : vscode.window.showInformationMessage;
  // Not awaited: the command shouldn't wait for the user to dismiss the notification.
  show(message, UIMessages.open, UIMessages.showInFolder).then((choice) => {
    const uri = vscode.Uri.file(outputPath);
    if (choice === UIMessages.open) {
      vscode.env.openExternal(uri);
    } else if (choice === UIMessages.showInFolder) {
      vscode.commands.executeCommand("revealFileInOS", uri);
    }
  });
};
