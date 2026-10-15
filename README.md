# Markdown PDF Plus

Export Markdown as PDF or HTML. Customize the output with CSS and images, and include Mermaid
diagrams and math!

## Features

- Export to **PDF** or standalone **HTML**.
- Uses VS Code's own Markdown renderer, so exports look like the Markdown preview and support the
  same syntax, including any Markdown plugins added by other installed extensions.
- **Mermaid** diagrams, rendered to vector graphics (no internet connection needed).
- **Math** (KaTeX), task lists, syntax-highlighted code, and local and remote images.
- Style exports with your own CSS, and control page size and margins.
- Fast: the browser used to create PDFs stays open between exports, so exports after the first
  usually take a second or two.

## Commands

### Export PDF

1. Open a Markdown file in VS Code.
2. Run **Markdown PDF Plus: Export PDF** from the Command Palette (`Ctrl+Shift+P` /
   `Cmd+Shift+P`), from the editor's right-click menu, or by right-clicking Markdown files in the
   Explorer (several files can be selected at once).
3. Click **Open** in the notification to view the PDF.

Demo:

![Export PDF](public/recording_export_pdf.gif)

### Export HTML

Same as above, using **Markdown PDF Plus: Export HTML**. The HTML file is self-contained apart
from images and linked stylesheets, which are referenced relative to the exported file.

## Requirements

Creating PDFs (and rendering Mermaid diagrams in HTML exports) needs a Chromium-based browser.
An installed **Google Chrome**, **Microsoft Edge**, **Chromium** or **Brave** is found
automatically. If none is installed, the extension offers to download a private copy of headless
Chromium, or you can point the `markdown-pdf-plus.executablePath` setting at a browser.

## Extension Settings

This extension contributes the following settings:

- `markdown-pdf-plus.marginTop`: The width\* of the top margin of pages for exported PDFs.
- `markdown-pdf-plus.marginBottom`: The width\* of the bottom margin of pages for exported PDFs.
- `markdown-pdf-plus.marginLeft`: The width\* of the left margin of pages for exported PDFs.
- `markdown-pdf-plus.marginRight`: The width\* of the right margin of pages for exported PDFs.
- `markdown-pdf-plus.pageSize`: The size of pages for exported PDFs, e.g. `a4`, `letter`,
  `a4 landscape` or `8.5in 11in`. See the
  [documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/@page/size) for the `size` CSS
  at-rule descriptor for more information.
- `markdown-pdf-plus.usePageStyleFromCSS`: Give any
  [@page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule declared in your CSS
  priority over the page size and margin settings above.
- `markdown-pdf-plus.CSSPath`: The path of a CSS file used to style exported documents. See the
  [custom CSS documentation](./docs/customCss.md) for rule-precedence details.
- `markdown-pdf-plus.CSSRaw`: Raw CSS used to style exported documents, e.g.
  `body { color: red; }`. See the [custom CSS documentation](./docs/customCss.md) for
  rule-precedence details.
- `markdown-pdf-plus.outputHome`: The directory where exported files are created. If empty,
  exports are created next to the Markdown file.
- `markdown-pdf-plus.outputFilename`: The filename of exported files (without an extension). If
  empty, the name of the Markdown file is used.
- `markdown-pdf-plus.mermaidTheme`: The [theme](https://mermaid.js.org/config/theming.html) used
  for Mermaid diagrams: `default`, `neutral`, `dark`, `forest` or `base`.
- `markdown-pdf-plus.executablePath`: The path of the Chromium-based browser used to create PDFs.
  If empty, one is found automatically.

\*Available units include `px`, `cm`, `mm` and `in`. See Mozilla's documentation on
[length units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#absolute_length_units) for
more options.

Paths in `CSSPath` and `outputHome` can be absolute, or relative to the Markdown file's folder,
and can use `~` (your home directory) and `${workspaceFolder}`.

The exports also follow these VS Code settings, like the Markdown preview does:
`markdown.styles`, `markdown.preview.fontFamily`, `markdown.preview.fontSize` and
`markdown.preview.lineHeight`.

## Page Customization (Margins, Page Breaks, Etc.) and Custom CSS

Please see the [custom CSS documentation](./docs/customCss.md) for details regarding styling
exported documents.

In lieu of using the contributed extension settings, page properties of exported PDFs (e.g.,
margins, page size) can be customized via creating CSS that includes an
[@page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule and setting
`markdown-pdf-plus.usePageStyleFromCSS` to `true`. For a more detailed example please see the
[custom CSS documentation](./docs/customCss.md).

Page breaks can be added to exported PDFs by inserting
`<div style="page-break-before:always"></div>` into the source Markdown file wherever a page break
is desired.

## Troubleshooting

Each export is logged, with timings, in the **Markdown PDF Plus** channel of the Output panel
(**View: Toggle Output**). If an export fails, the error notification has a **Show Log** button.

## Release Notes

See the [changelog](CHANGELOG.md).

## Third-Party Software

This product includes software developed by third-party sources. Please see the Third-Party
Software section of [LICENSE](LICENSE.md) for details.
