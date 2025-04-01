import * as vscode from "vscode";
import { ExtensionContext, Uri, Webview } from "vscode";
import path from "path";

import LanguageIdentifiers from "../constants/languageIdentifiers";

/**
 * Determines whether the given document is Markdown.
 *
 * @param doc The document whose Markdown-ness is to be determined.
 * @returns True if the given document is Markdown.
 */
const isMdDocument = (doc: vscode.TextDocument | undefined): boolean => {
  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) 2017 张宇. All rights reserved.
   *  Licensed under the MIT License. See LICENSE in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  if (doc) {
    const extraLangIds = vscode.workspace
      .getConfiguration("markdown.extension")
      .get<Array<string>>("extraLangIds");
    const langId = doc.languageId;
    if (extraLangIds?.includes(langId)) {
      return true;
    }
    if (langId === LanguageIdentifiers.Markdown) {
      return true;
    }
  }
  return false;
};

/**
 * Returns the absolute path to a file located in the MRS package.
 *
 * @param relativePath A relative path to a resource contained in the extension.
 * @param context The context of this extension to get its path regardless where it is installed.
 * @param webview When given format the path for use in this webview.
 * @returns The absolute path to a file located in our misc folder.
 */
const getAbsolutePath = (
  relativePath: string,
  context: ExtensionContext,
  webView?: Webview
): string => {
  if (webView) {
    const uri = Uri.file(context.asAbsolutePath(relativePath));
    return webView.asWebviewUri(uri).toString();
  }
  return context.asAbsolutePath(relativePath);
};

/**
 * Returns the given filename (of filetype described by `currentExtension`) and returns the same filename
 * but with the `desiredExtension` appended to the end.
 *
 * @param filename The name of the file for which to change the extension.
 * @param currentExtension The file extension which describes the format of the file whose name is to be changed.
 *  Includes the "." (e.g., use `.md`, not `md`).
 * @param desiredExtension The file extension of the outputted filename.
 * Includes the "." (e.g., use `.html`, not `html`).
 *
 */
const convertFileExtension = (
  filename: string,
  currentExtension: string,
  desiredExtension: string
): string => {
  return filename.includes(currentExtension)
    ? filename.replace(currentExtension, desiredExtension)
    : filename + desiredExtension;
};

export { convertFileExtension, getAbsolutePath, isMdDocument };
