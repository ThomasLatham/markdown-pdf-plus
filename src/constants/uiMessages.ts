"use strict";

/**
 * Messages to display to user.
 */
const enum UIMessages {
  invalidInputMarkdownPath = "Export failed: Path to Markdown file was not valid.",
  invalidInputMarkdownFile = "Export failed: Input file is not in Markdown.",
  noValidMarkdownFile = "Export failed: No valid Markdown file.",
  exportToHtmlFailed = "Exporting file to HTML failed.",
  exportToHtmlSucceeded = "File successfully exported to HTML.",
  renamingOrMovingHtmlFailed = "Exported HTML could not be renamed and/or moved.",
  exportToPdfFailed = "Exporting file to PDF failed.",
  exportToPdfSucceeded = "File successfully exported to PDF.",
}

export default UIMessages;
