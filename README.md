# Markdown PDF Plus

Export Markdown as PDF or HTML. Customize the output with CSS and images!

## Features

### Export PDF

Export a Markdown file to PDF:

1. Open the Markdown file in a VS Code editor.
2. Open the Command Palette with `Ctrl+Shift+P`.
3. Search for "Markdown PDF Plus: Export PDF" and select that option.
4. Wait for the PDF to generate (5-10 seconds).
5. Enjoy the finished product!

Demo:

![Export PDF](public/recording_export_pdf.gif)

### Export HTML

1. Open the Markdown file in a VS Code editor.
2. Open the Command Palette with `Ctrl+Shift+P`.
3. Search for "Markdown PDF Plus: Export HTML" and select that option.
4. Wait for the HTML file to generate (1-2 seconds).
5. Enjoy the finished product!

Demo: See the demo for Export PDF —— it's the same flow, except with the HTML command rather than
the PDF one.

### Page Customization (Margins, Page Breaks, Etc.)

Page properties of exported PDFs (e.g., margins, page size) can be customized via creating CSS that
includes an
[@page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule and inserting that CSS into
the PDF's source Markdown file. For a more detailed example please see [this
answer](https://github.com/ThomasLatham/markdown-pdf-plus/issues/5#issuecomment-2180816708) to a related
issue on this project's GitHub.

Page breaks can be rendered in exported PDFs by inserting `<div
style="page-break-before:always"></div>` into the source Markdown file wherever a page break is
desired. For reference please see [this
answer](https://github.com/ThomasLatham/markdown-pdf-plus/issues/6#issuecomment-2111540362) to a
related issue on this project's GitHub.

## Extension Settings

This extension contributes the following settings:

- `markdown-pdf-plus.outputHome`: The path of the directory where you wish your exported file to be
  created (without trailing slash). If empty, defaults to the directory of the currently-open file
  when a relevant command is called.
- `markdown-pdf-plus.outputFilename`: The filename under which you wish your exported file to be
  created (without any given extension). If empty, defaults to the name of your input file.
- `markdown-pdf-plus.usePageStyleFromCSS`: Give any
  [@page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule declared in CSS priority
  over the extension's default page settings.

## Release Notes

See the [changelog](CHANGELOG.md).

## Third-Party Software

This product includes software developed by third-party sources. Please see the Third-Party Software
section of LICENSE in the root directory for details.
