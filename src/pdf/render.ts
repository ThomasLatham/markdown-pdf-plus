import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "url";
import type { Page } from "puppeteer-core";

import { MermaidTheme } from "../export/settings";
import { MERMAID_CLASS } from "../lib/mermaid";
import { BrowserOptions, withPage } from "./browser";

export interface RenderOptions {
  browser: BrowserOptions;
  /** Path of the Mermaid browser bundle shipped with the extension. */
  mermaidScriptPath: string;
  mermaidTheme: MermaidTheme;
  renderMermaid: boolean;
  /** Warn about images and stylesheets that failed to load. */
  reportFailedRequests: boolean;
  /** If given, the page is printed to a PDF at this path. */
  pdfPath?: string;
  warn: (message: string) => void;
  /** Records the end of a phase of the export, for timing. */
  mark: (phase: string) => void;
}

export interface RenderResult {
  /** The rendered contents of each `.mermaid-diagram` element, in document order. */
  mermaidDiagrams: string[];
}

const LOAD_TIMEOUT_MS = 60 * 1000;
const PDF_TIMEOUT_MS = 120 * 1000;

/**
 * Loads an HTML document in the headless browser, renders its Mermaid diagrams, and optionally
 * prints it to PDF.
 */
export const renderInBrowser = async (
  html: string,
  options: RenderOptions
): Promise<RenderResult> => {
  // Local images and stylesheets are referenced with file:// URLs, which Chromium only allows
  // from a page that is itself a file, so the page can't be loaded with `setContent`.
  const tempFile = path.join(
    os.tmpdir(),
    `markdown-pdf-plus-${crypto.randomBytes(8).toString("hex")}.html`
  );
  await fs.promises.writeFile(tempFile, withRenderScripts(html, options), "utf8");

  try {
    return await withPage(options.browser, async (page) => {
      options.mark("browser");
      const failedRequests: string[] = [];
      page.on("requestfailed", (request) => {
        const url = request.url();
        if (!url.startsWith("data:")) {
          failedRequests.push(url);
        }
      });

      try {
        await page.goto(pathToFileURL(tempFile).href, {
          waitUntil: "load",
          timeout: LOAD_TIMEOUT_MS,
        });
      } catch (error) {
        if ((error as Error).name !== "TimeoutError") {
          throw error;
        }
        options.warn("Some images or stylesheets took too long to load and may be missing.");
      }
      options.mark("load");

      let mermaidDiagrams: string[] = [];
      if (options.renderMermaid) {
        mermaidDiagrams = await renderMermaid(page, options);
        options.mark("mermaid");
      }

      await page.evaluate(() => document.fonts.ready.then(() => undefined));

      if (options.reportFailedRequests && failedRequests.length) {
        options.warn(`Couldn't load: ${failedRequests.join(", ")}`);
      }

      if (options.pdfPath) {
        const pdf = await page.pdf({
          printBackground: true,
          // Page size and margins come from the @page rule built from the extension's settings.
          preferCSSPageSize: true,
          timeout: PDF_TIMEOUT_MS,
        });
        await fs.promises.writeFile(options.pdfPath, pdf);
        options.mark("pdf");
      }

      return { mermaidDiagrams };
    });
  } finally {
    await fs.promises.unlink(tempFile).catch(() => undefined);
  }
};

/**
 * Adds a Content-Security-Policy that blocks scripts in the document, as VS Code's Markdown
 * preview does, so that exporting an untrusted Markdown file can't run code. The only script
 * allowed is our own copy of Mermaid, which is loaded from disk by the browser (much faster than
 * sending its 5 MB over the DevTools protocol).
 */
const withRenderScripts = (html: string, options: RenderOptions): string => {
  const nonce = crypto.randomBytes(16).toString("base64");
  const policy = `script-src 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`;
  const tags =
    `<meta http-equiv="Content-Security-Policy" content="${policy}">` +
    (options.renderMermaid
      ? `<script nonce="${nonce}" src="${
          pathToFileURL(options.mermaidScriptPath).href
        }"></script>` +
        `<script nonce="${nonce}">mermaid.initialize({ startOnLoad: false });</script>`
      : "");
  return html.replace(/<head>/i, (head) => head + tags);
};

const renderMermaid = async (page: Page, options: RenderOptions): Promise<string[]> => {
  const errors = await page.evaluate(
    async (theme: string, sourceClass: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mermaid = (window as any).mermaid;
      mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict" });

      const failures: string[] = [];
      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>(`.mermaid-diagram > pre.${sourceClass}`)
      );
      for (let i = 0; i < blocks.length; i++) {
        const id = `mpp-mermaid-${i}`;
        try {
          const { svg } = await mermaid.render(id, blocks[i].textContent ?? "");
          blocks[i].outerHTML = svg;
        } catch (error) {
          failures.push(`diagram ${i + 1}: ${(error as Error)?.message ?? String(error)}`);
          // Mermaid can leave its scratch elements behind when a diagram fails to parse.
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
        }
      }
      return failures;
    },
    options.mermaidTheme,
    MERMAID_CLASS
  );

  for (const error of errors) {
    options.warn(`Mermaid ${error.split("\n")[0]}`);
  }

  return page.$$eval(".mermaid-diagram", (elements) => elements.map((e) => e.innerHTML));
};
