import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { CheerioAPI, load } from "cheerio";

import { normalizeMermaidBlocks } from "../lib/mermaid";
import { buildPageRule } from "../lib/pageStyle";
import { expandPath, PathContext, stripExtension } from "../lib/paths";
import { renderTaskLists } from "../lib/taskLists";
import {
  createLocalResolver,
  isNonLocalUrl,
  rewriteCssUrls,
  rewriteHtmlUrls,
  toFileUrl,
  toRelativeUrl,
  UrlMapper,
} from "../lib/urls";
import { ExportSettings } from "./settings";

export type ExportFormat = "html" | "pdf";

export interface BuildOptions {
  doc: vscode.TextDocument;
  format: ExportFormat;
  /** Where the exported file will be written. HTML exports link resources relative to it. */
  outputPath: string;
  settings: ExportSettings;
  pathContext: PathContext;
  warn: (message: string) => void;
}

export interface BuiltDocument {
  $: CheerioAPI;
  mermaidCount: number;
}

// Matches the KaTeX version bundled with VS Code's built-in math support.
const KATEX_CDN_STYLESHEET = "https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css";

// Lowest-precedence defaults that make printed output nicer; any other CSS overrides them.
const BASE_STYLES = `
.mermaid-diagram { margin: 1em 0; text-align: center; break-inside: avoid; }
.mermaid-diagram svg { max-width: 100%; height: auto; }
img { max-width: 100%; break-inside: avoid; }
h1, h2, h3, h4, h5, h6 { break-after: avoid; }
.task-list-item { list-style-type: none; }
.task-list-item-checkbox { margin: 0 0.2em 0.25em -1.4em; vertical-align: middle; }
`;

// In PDFs the page margins come from the margin settings (or an @page rule), so drop the
// padding that VS Code's preview stylesheet adds around the content.
const PDF_BASE_STYLES = `
html, body { padding-left: 0; padding-right: 0; }
body { margin: 0; padding-top: 0; }
`;

/**
 * Renders a Markdown document to a complete, standalone HTML document using VS Code's built-in
 * Markdown renderer (the same one, with the same plugins, that powers the Markdown preview).
 */
export const buildHtmlDocument = async (options: BuildOptions): Promise<BuiltDocument> => {
  const { doc, format, outputPath, settings, pathContext, warn } = options;

  const bodyHtml = await renderMarkdown(doc);
  const $ = load(
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      "<title></title></head>" +
      `<body class="vscode-body vscode-light">${bodyHtml}</body></html>`
  );

  stripPreviewAttributes($);
  renderTaskLists($);
  const mermaidCount = normalizeMermaidBlocks($);

  const baseDir = pathContext.fileDir ?? pathContext.workspaceFolder ?? path.dirname(outputPath);
  const outputDir = path.dirname(outputPath);
  // PDFs are rendered from a temporary file, so they need absolute URLs; HTML exports use URLs
  // relative to the exported file so that a folder of exports can be moved around together.
  const mapperFor = (dir: string): UrlMapper => {
    const resolve = createLocalResolver(dir, pathContext.workspaceFolder);
    return (url) => {
      const ref = resolve(url);
      if (!ref) {
        return undefined;
      }
      return format === "pdf" ? toFileUrl(ref) : toRelativeUrl(ref, outputDir);
    };
  };

  // .md links point at the .html exports of those files, as with Markdown All in One.
  if (format === "html") {
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href") as string;
      if (!isNonLocalUrl(href)) {
        $(element).attr("href", href.replace(/\.(md|markdown)(?=$|[?#])/i, ".html"));
      }
    });
  }

  // Links, images and inline styles in the Markdown are relative to the Markdown file. This has
  // to happen before any other styles are added, since their URLs are relative to other places.
  rewriteHtmlUrls($, mapperFor(baseDir));

  const hasMath = $(".katex, .katex-display").length > 0;

  // <head>: preview styles from VS Code and installed extensions, then user font settings.
  const head = $("head");
  for (const stylesheet of getPreviewStylesheets()) {
    if (/katex(\.min)?\.css$/i.test(stylesheet)) {
      if (!hasMath) {
        continue;
      }
      if (format === "html") {
        // KaTeX's fonts live inside the VS Code installation, so link a hosted copy instead.
        head.append(`<link rel="stylesheet" href="${KATEX_CDN_STYLESHEET}">`);
        continue;
      }
    }
    head.append(stylesheetElement(stylesheet, format, mapperFor(path.dirname(stylesheet))));
  }
  head.append(`<style>${BASE_STYLES}${format === "pdf" ? PDF_BASE_STYLES : ""}</style>`);
  for (const style of getMarkdownStylesSetting(doc, pathContext)) {
    head.append(
      isNonLocalUrl(style)
        ? `<link rel="stylesheet" href="${escapeAttribute(style)}">`
        : stylesheetElement(style, format, mapperFor(path.dirname(style)))
    );
  }
  const fontStyle = getPreviewFontStyle(doc);
  if (fontStyle) {
    head.append(`<style>${fontStyle}</style>`);
  }

  // Styles from settings go at the end of <body> so they override styles embedded in the
  // Markdown. See docs/customCss.md for the precedence rules.
  const body = $("body");
  if (settings.cssPath.trim()) {
    const cssFile = expandPath(settings.cssPath, pathContext);
    if (fs.existsSync(cssFile)) {
      body.append(stylesheetElement(cssFile, format, mapperFor(path.dirname(cssFile)), true));
    } else {
      warn(`The stylesheet set in "markdown-pdf-plus.CSSPath" wasn't found: ${cssFile}`);
    }
  }
  if (settings.cssRaw.trim()) {
    body.append(`<style>${rewriteCssUrls(settings.cssRaw, mapperFor(baseDir))}</style>`);
  }

  if (format === "pdf") {
    const pageRule = buildPageRule(settings);
    if (pageRule) {
      if (settings.usePageStyleFromCSS) {
        // First in the document, so any @page rule in the user's CSS wins.
        head.prepend(`<style>${pageRule}</style>`);
      } else {
        body.append(`<style>${pageRule}</style>`);
      }
    }
  }

  const title = $("h1").first().text().trim() || stripExtension(path.basename(doc.fileName));
  $("title").text(title);

  return { $, mermaidCount };
};

const renderMarkdown = async (doc: vscode.TextDocument): Promise<string> => {
  let html: unknown;
  try {
    html = await vscode.commands.executeCommand("markdown.api.render", doc);
  } catch (error) {
    html = undefined;
  }
  if (typeof html !== "string") {
    throw new Error(
      "VS Code's built-in Markdown renderer isn't available. " +
        'Make sure the built-in "Markdown Language Features" extension is enabled.'
    );
  }
  return html;
};

/** Removes attributes that only make sense in VS Code's preview (scroll sync, link handling). */
const stripPreviewAttributes = ($: CheerioAPI): void => {
  $("[data-line]").removeAttr("data-line");
  $("[data-href]").removeAttr("data-href");
  $("[data-src]").removeAttr("data-src");
  $("[dir=auto]").removeAttr("dir");
  $(".code-line").removeClass("code-line");
  $("[class='']").removeAttr("class");
  $("div:not([class]):not([id]):not([style]):empty").remove();
};

/**
 * A `<link>` (PDF) or inlined `<style>` (HTML) for a local stylesheet. HTML exports inline styles
 * so that the exported file keeps working when it's moved away from the extension's files.
 */
const stylesheetElement = (
  file: string,
  format: ExportFormat,
  mapUrl: UrlMapper,
  alwaysInline = false
): string => {
  if (format === "pdf" && !alwaysInline) {
    return `<link rel="stylesheet" href="${escapeAttribute(
      toFileUrl({ filePath: file, suffix: "" })
    )}">`;
  }
  let css: string;
  try {
    css = fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
  return `<style>${rewriteCssUrls(css, mapUrl)}</style>`;
};

/** Stylesheets contributed to the Markdown preview by VS Code and installed extensions. */
const getPreviewStylesheets = (): string[] => {
  const builtIn = "vscode.markdown-language-features";
  const extensions = [...vscode.extensions.all].sort(
    (a, b) => Number(b.id === builtIn) - Number(a.id === builtIn)
  );
  const stylesheets: string[] = [];
  for (const extension of extensions) {
    const styles = extension.packageJSON?.contributes?.["markdown.previewStyles"];
    if (!Array.isArray(styles)) {
      continue;
    }
    for (const style of styles) {
      if (typeof style === "string") {
        const file = path.join(extension.extensionPath, style);
        if (fs.existsSync(file)) {
          stylesheets.push(file);
        }
      }
    }
  }
  return stylesheets;
};

/** Stylesheets from VS Code's `markdown.styles` setting. */
const getMarkdownStylesSetting = (doc: vscode.TextDocument, context: PathContext): string[] => {
  const styles = vscode.workspace.getConfiguration("markdown", doc.uri).get<string[]>("styles", []);
  return styles
    .filter((style) => typeof style === "string" && style.trim())
    .map((style) =>
      isNonLocalUrl(style)
        ? style
        : expandPath(style, { ...context, fileDir: context.workspaceFolder ?? context.fileDir })
    )
    .filter((style) => isNonLocalUrl(style) || fs.existsSync(style));
};

/** Mirrors the font settings of VS Code's Markdown preview. */
const getPreviewFontStyle = (doc: vscode.TextDocument): string => {
  const preview = vscode.workspace.getConfiguration("markdown.preview", doc.uri);
  const fontFamily = preview.get<string>("fontFamily", "");
  const fontSize = preview.get<number>("fontSize", 0);
  const lineHeight = preview.get<number>("lineHeight", 0);
  const declarations = [
    fontFamily ? `font-family: ${fontFamily};` : "",
    fontSize > 0 ? `font-size: ${fontSize}px;` : "",
    lineHeight > 0 ? `line-height: ${lineHeight};` : "",
  ].join(" ");
  return declarations.trim() ? `body { ${declarations} }` : "";
};

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
