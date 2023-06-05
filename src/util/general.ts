/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2017 张宇. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import LanguageIdentifiers from "../constants/languageIdentifiers";

const isMdDocument = (doc: vscode.TextDocument | undefined): boolean => {
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

export default isMdDocument;
