import * as vscode from "vscode";
import * as fs from "fs";

import UIMessages from "../constants/uiMessages";
import isMdDocument from "../util/general";
import path = require("path");
import exportResumeHtml from "./export.html";

const exportResumePdf = async () => {
  exportResumeHtml(true);
};

export default exportResumePdf;
