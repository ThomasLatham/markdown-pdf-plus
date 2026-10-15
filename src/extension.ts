import * as vscode from "vscode";

import { ExportFormat } from "./export/document";
import { exportMarkdown, ExportServices } from "./export/exporter";
import { closeBrowser } from "./pdf/browser";

export const activate = (context: vscode.ExtensionContext): void => {
  const services: ExportServices = {
    context,
    log: vscode.window.createOutputChannel("Markdown PDF Plus", { log: true }),
  };

  // From the Explorer context menu, commands receive the clicked file and every selected file.
  const exportCommand =
    (format: ExportFormat) =>
    async (resource?: vscode.Uri, selected?: vscode.Uri[]): Promise<string | undefined> => {
      const targets = selected?.length ? selected : [resource];
      let lastOutput: string | undefined;
      for (const target of targets) {
        lastOutput = await exportMarkdown(
          services,
          format,
          target instanceof vscode.Uri ? target : undefined
        );
      }
      return lastOutput;
    };

  context.subscriptions.push(
    services.log,
    vscode.commands.registerCommand("markdown-pdf-plus.export.pdf", exportCommand("pdf")),
    vscode.commands.registerCommand("markdown-pdf-plus.export.html", exportCommand("html")),
    { dispose: () => void closeBrowser() }
  );
};

export const deactivate = (): Promise<void> => closeBrowser();
