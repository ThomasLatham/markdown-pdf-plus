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
