# Markdown PDF Plus

Export Markdown as PDF or HTML. Customize the output with CSS and images!

## Commands

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

## Extension Settings

This extension contributes the following settings:

- `markdown-pdf-plus.marginTop`: The width* of the top margin of pages for exported PDFs.
- `markdown-pdf-plus.marginBottom`: The width* of the bottom margin of pages for exported PDFs.
- `markdown-pdf-plus.marginLeft`: The width* of the left margin of pages for exported PDFs.
- `markdown-pdf-plus.marginRight`: The width* of the right margin of pages for exported PDFs.
- `markdown-pdf-plus.pageSize`: The size of pages for exported PDFs. See the
  [documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/@page/size) for the size CSS
  at-rule descriptor, used with the `@page` at-rule, for more information.
- `markdown-pdf-plus.CSSPath`: The path of the CSS file you wish to use to style exported documents.
  See the [custom CSS documentation](./docs/customCss.md) for rule-precedence details.
- `markdown-pdf-plus.CSSRaw`: The raw CSS you wish to use to style exported documents. E.g., `body {
  color: red; }`.   See the [custom CSS documentation](./docs/customCss.md) for rule-precedence details.
- `markdown-pdf-plus.outputHome`: The path of the directory where you wish your exported file to be
  created (without trailing slash). If empty, defaults to the directory of the currently-open file
  when a relevant command is called.
- `markdown-pdf-plus.outputFilename`: The filename under which you wish your exported file to be
  created (without any given extension). If empty, defaults to the name of your input file.
- `markdown-pdf-plus.usePageStyleFromCSS`: Give any
  [@page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule declared in CSS priority
  over the extension's default page settings.

*Available units include `px`, `cm` and `in`. See Mozilla's documentation on [length
units](https://developer.mozilla.org/en-US/docs/Web/CSSlength#absolute_length_units) for more options

## Page Customization (Margins, Page Breaks, Etc.) and Custom CSS

Please see the [custom CSS documentation](./docs/customCss.md) for details regarding styling
exported documents.

In lieu of using the contributed extension settings, page properties of exported PDFs (e.g.,
margins, page size) can be customized via creating CSS that includes an 
[@page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule and inserting that CSS into
the PDF's source Markdown file. For a more detailed example please see the [custom CSS documentation](./docs/customCss.md)

Page breaks can be rendered in exported PDFs by inserting `<div
style="page-break-before:always"></div>` into the source Markdown file wherever a page break is desired.


## Known Issues

### Exporting PDF overwrites HTML

1. Export a Markdown file (`my_file.md`, for example) to HTML resulting in `my_file.html`.
2. Make some changes to the Markdown file and save them.
3. Export the same Markdown file to PDF, resulting in `my_file.pdf`.

Expected result: The changes made in step 2. should not be reflected in `my_file.html`.

Actual result: The changes made in step 2. are reflected in `my_file.html`.

## Release Notes

See the [changelog](CHANGELOG.md).

## Third-Party Software

This product includes software developed by third-party sources. Please see the Third-Party Software
section of LICENSE in the root directory for details.
