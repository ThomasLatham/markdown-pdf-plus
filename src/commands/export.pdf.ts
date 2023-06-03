import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");

import UIMessages from "../constants/uiMessages";
import isMdDocument from "../util/general";
import exportResumeHtml from "./export.html";

const exportResumePdf = async () => {
  exportResumeHtml(true);
};

export default exportResumePdf;
