"use strict";

/**
 * Messages to display to user.
 */
const enum UIMessages {
  invalidInputMarkdownPath = "Export failed: Path to Markdown file was not valid.",
  invalidInputMarkdownFile = "Export failed: Input file is not in Markdown.",
  noValidMarkdownFile = "Export failed: No valid Markdown file.",
  exportToHtmlFailed = "Exporting resume to HTML failed.",
  exportToHtmlSucceeded = "Resume successfully exported to HTML.",
  renamingOrMovingHtmlFailed = "Exported HTML could not be renamed and/or moved.",
}

export default UIMessages;
