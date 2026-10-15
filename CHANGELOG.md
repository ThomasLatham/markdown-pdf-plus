# Change Log

All notable changes to the "markdown-pdf-plus" extension will be documented in this file.

## [2.0.0]

A rewrite of how documents are exported, making exports faster and more reliable.

### Added

- Export commands in the editor's right-click menu, and in the Explorer's right-click menu for
  Markdown files (several files can be exported at once).
- `markdown-pdf-plus.mermaidTheme` setting.
- `markdown-pdf-plus.executablePath` setting, to choose the browser used to create PDFs.
- Task list (`- [ ]` / `- [x]`) checkboxes.
- After exporting, the notification has buttons to open the exported file or show it in its folder.
- Exports are logged, with timings, in the "Markdown PDF Plus" Output channel.
- `outputHome` and `CSSPath` accept paths relative to the Markdown file, `~` and
  `${workspaceFolder}`.

### Changed

- Requires VS Code 1.90 or later.
- Markdown is now rendered by VS Code's built-in Markdown renderer, so the extension no longer
  requires Markdown All in One.
- PDFs are created with an installed Chrome, Edge or Chromium, kept open between exports, instead
  of downloading Chromium into the extension. If no browser is installed, the extension offers to
  download one.
- The page margin settings are now the actual page margins. Previously VS Code's preview padding
  (about 60px on each side) was added on top of them, so PDF content is wider than in 1.x. To get
  the old layout back, increase the margin settings by about 60px.
- `usePageStyleFromCSS` now consistently decides whether the page settings or the document's own
  `@page` rules win.
- HTML exports link local images and stylesheets relative to the exported file, so they work when
  exported to another folder.
- Unsaved changes are exported without saving the file first.
- Scripts in Markdown files (`<script>` tags and inline event handlers) no longer run while
  exporting, as in VS Code's Markdown preview. They're still included in exported HTML files.

### Fixed

- Mermaid diagrams weren't rendered. They're now drawn as vector graphics in both PDF and HTML
  exports, without needing an internet connection.
- PDF export failed for images whose paths contain spaces or other encoded characters, and for
  `data:` URIs in images or CSS.
- `CSSPath`/`CSSRaw` styles, and the Mermaid script, were sometimes missing from exports.
- Exporting to PDF overwrote an existing HTML export of the same file.
- Exports were slow: the extension waited up to 6 seconds for an intermediate file, and launched
  a new browser for every export.

## [1.1.0]

- Contributed settings `markdown-pdf-plus.CSSPath` and `markdown-pdf-plus.CSSRaw` to enable globally
  setting styles that are applied to all exports.

## [1.0.0]

- Initial release
