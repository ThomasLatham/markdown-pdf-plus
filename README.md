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

Demo: See the demo for Export PDF —— it's the same flow.

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

## Known Issues

### Exporting PDF overwrites HTML

1. Export a Markdown file (`my_file.md`, for example) to HTML resulting in `my_file.html`.
2. Make some changes to the Markdown file and save them.
3. Export the same Markdown file to PDF, resulting in `my_file.pdf`.

Expected result: The changes made in step 2. should not be reflected in `my_file.html`.

Actual result: The changes made in step 2. are reflected in `my_file.html`.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of Markdown PDF Plus.

## Third-Party Software

This product includes software developed by third-party sources. Please see the Third-Party Software
section of LICENSE in the root directory for details.
