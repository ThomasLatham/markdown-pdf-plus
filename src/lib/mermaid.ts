import type { CheerioAPI } from "cheerio";

/**
 * Selectors for the different ways a Mermaid code block can come out of the Markdown renderer:
 * - `pre.mermaid`: VS Code's built-in Mermaid support (VS Code 1.10x+)
 * - `div.mermaid`: the "Markdown Preview Mermaid Support" extension
 * - `pre > code.language-mermaid`: plain markdown-it, with no Mermaid plugin installed
 */
const MERMAID_SOURCES = "pre.mermaid, div.mermaid, pre > code.language-mermaid";

/**
 * Class of the `<pre>` elements that `normalizeMermaidBlocks` leaves for the renderer. Deliberately
 * not "mermaid", so Mermaid's own page-load handling can never pick them up.
 */
export const MERMAID_CLASS = "mermaid-source";

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Rewrites every Mermaid block in the document into a single canonical form,
 * `<div class="mermaid-diagram"><pre class="mermaid-source">source</pre></div>`, and removes markup
 * that only makes sense inside VS Code's preview.
 *
 * @returns The number of Mermaid diagrams in the document.
 */
export const normalizeMermaidBlocks = ($: CheerioAPI): number => {
  // Config element emitted by VS Code's built-in Mermaid support for its preview script.
  $("#markdown-mermaid").remove();

  let count = 0;
  $(MERMAID_SOURCES).each((_, element) => {
    const $element = $(element);
    const container = element.tagName === "code" ? $element.parent() : $element;
    if (container.parent().hasClass("mermaid-diagram")) {
      return;
    }
    const source = $element.text().trim();
    container.replaceWith(
      `<div class="mermaid-diagram"><pre class="${MERMAID_CLASS}">${escapeHtml(source)}</pre></div>`
    );
    count++;
  });
  return count;
};
