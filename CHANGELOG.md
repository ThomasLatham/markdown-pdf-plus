# Change Log

All notable changes to the "markdown-pdf-plus" extension will be documented in this file.

## [1.0.0]

- Initial release

## [1.0.6]

- Minimum VS Code version set to 1.76.0.

## [1.0.8]

- [Fixed bug](https://github.com/ThomasLatham/markdown-pdf-plus/pull/3) causing `Markdown PDF Plus:
  Export PDF` to fail in the absence of an internet connection.
- Minimum VS Code version set to 1.75.0.

## [1.1.0]

- Using [Puppeteer Chromium Resolver](https://github.com/cenfun/puppeteer-chromium-resolver) to
  resolve Chromium for `puppeteer.launch()`, in case user doesn't have
  `C://Users/<user>/.cache/puppeteer` directory.
- Updated the extension's icon for better visibility in the Marketplace and in the IDE.

## [1.2.0]

- [Mermaid](https://mermaid.js.org/) is supported.
- Updated the README to include page-customization details.
