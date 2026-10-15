import * as vscode from "vscode";

import { PageSettings } from "../lib/pageStyle";

export const SETTINGS_SECTION = "markdown-pdf-plus";

export type MermaidTheme = "default" | "neutral" | "dark" | "forest" | "base";

export interface ExportSettings extends PageSettings {
  cssPath: string;
  cssRaw: string;
  outputHome: string;
  outputFilename: string;
  usePageStyleFromCSS: boolean;
  executablePath: string;
  mermaidTheme: MermaidTheme;
}

export const getSettings = (resource?: vscode.Uri): ExportSettings => {
  const config = vscode.workspace.getConfiguration(SETTINGS_SECTION, resource);
  return {
    pageSize: config.get("pageSize", "a4"),
    marginTop: config.get("marginTop", "70px"),
    marginRight: config.get("marginRight", "70px"),
    marginBottom: config.get("marginBottom", "70px"),
    marginLeft: config.get("marginLeft", "70px"),
    cssPath: config.get("CSSPath", ""),
    cssRaw: config.get("CSSRaw", ""),
    outputHome: config.get("outputHome", ""),
    outputFilename: config.get("outputFilename", ""),
    usePageStyleFromCSS: config.get("usePageStyleFromCSS", false),
    executablePath: config.get("executablePath", ""),
    mermaidTheme: config.get("mermaidTheme", "default"),
  };
};
