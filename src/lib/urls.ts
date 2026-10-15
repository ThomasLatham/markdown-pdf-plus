import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import type { CheerioAPI } from "cheerio";

/**
 * Maps a URL found in a document to its replacement, or returns `undefined` to leave it unchanged.
 */
export type UrlMapper = (url: string) => string | undefined;

/** A reference to a local file, plus any `?query` / `#fragment` that followed the path. */
export interface LocalReference {
  filePath: string;
  suffix: string;
}

const WINDOWS_DRIVE = /^[a-z]:[\\/]/i;
// A URI scheme is at least two characters, so a Windows drive letter ("C:") never matches.
const HAS_SCHEME = /^[a-z][a-z0-9+.-]+:/i;

/**
 * True if the URL doesn't point at a file on disk (e.g. `https:`, `data:`, `mailto:`, `#anchor`,
 * protocol-relative `//host/...`) and so should be left alone.
 */
export const isNonLocalUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return true;
  }
  if (WINDOWS_DRIVE.test(trimmed)) {
    return false;
  }
  return HAS_SCHEME.test(trimmed) && !/^file:/i.test(trimmed);
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Creates a function that resolves a document-relative URL to a file on disk.
 *
 * @param baseDir Directory that relative URLs are resolved against (usually the Markdown file's).
 * @param rootDir Directory that root-relative URLs (`/images/x.png`) are resolved against
 *  (usually the workspace folder). Falls back to `baseDir`.
 */
export const createLocalResolver =
  (baseDir: string, rootDir?: string) =>
  (url: string): LocalReference | undefined => {
    const trimmed = url.trim();
    if (isNonLocalUrl(trimmed)) {
      return undefined;
    }

    if (/^file:/i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        const suffix = parsed.search + parsed.hash;
        parsed.search = "";
        parsed.hash = "";
        const filePath = decodeFileUrlPath(parsed);
        return { filePath, suffix };
      } catch {
        return undefined;
      }
    }

    // Separate the path from any query string or fragment. Windows paths can't contain "?" or
    // "#" in a way that we care about, so a simple split is fine.
    const match = /^([^?#]*)(.*)$/.exec(trimmed) as RegExpExecArray;
    const rawPath = match[1];
    const suffix = match[2];

    // VS Code's renderer hands us decoded paths ("img dir/a.png"), but hand-written HTML in the
    // Markdown usually has encoded ones ("img%20dir/a.png"). Try both and prefer one that exists.
    const candidates = Array.from(new Set([safeDecode(rawPath), rawPath])).map((p) => {
      if (WINDOWS_DRIVE.test(p) || (path.isAbsolute(p) && !p.startsWith("/"))) {
        return path.normalize(p);
      }
      if (p.startsWith("/")) {
        // A root-relative path, or an absolute POSIX path that already exists on disk.
        if (path.sep === "/" && fs.existsSync(p)) {
          return p;
        }
        return path.join(rootDir ?? baseDir, p);
      }
      return path.resolve(baseDir, p);
    });

    const filePath = candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
    return { filePath, suffix };
  };

const decodeFileUrlPath = (url: URL): string => {
  // `fileURLToPath` rejects some URLs that browsers accept (e.g. "file:///c:\dir\x.png", which
  // Markdown All in One used to emit), so decode manually.
  let p = safeDecode(url.pathname);
  if (/^\/[a-z]:/i.test(p)) {
    p = p.slice(1);
  }
  return path.normalize(p);
};

/** An absolute `file://` URL for the given file, keeping any query/fragment. */
export const toFileUrl = (ref: LocalReference): string =>
  pathToFileURL(ref.filePath).href + ref.suffix;

/**
 * A URL for the given file relative to `fromDir`, so that a document saved in `fromDir` can find
 * it. Falls back to an absolute `file://` URL when no relative path exists (different drives).
 */
export const toRelativeUrl = (ref: LocalReference, fromDir: string): string => {
  const relative = path.relative(fromDir, ref.filePath);
  if (!relative || path.isAbsolute(relative)) {
    return toFileUrl(ref);
  }
  return relative.split(path.sep).map(encodeURIComponent).join("/") + ref.suffix;
};

/**
 * Applies `mapUrl` to every `url(...)` and `@import "..."` reference in a stylesheet.
 */
export const rewriteCssUrls = (css: string, mapUrl: UrlMapper): string =>
  css
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote: string, url: string) => {
      const mapped = mapUrl(url);
      return mapped === undefined ? match : `url(${quote || '"'}${mapped}${quote || '"'})`;
    })
    .replace(/(@import\s+)(['"])(.*?)\2/gi, (match, prefix: string, quote: string, url: string) => {
      const mapped = mapUrl(url);
      return mapped === undefined ? match : `${prefix}${quote}${mapped}${quote}`;
    });

const URL_ATTRIBUTES: ReadonlyArray<[selector: string, attribute: string]> = [
  ["img", "src"],
  ["source", "src"],
  ["video", "src"],
  ["video", "poster"],
  ["audio", "src"],
  ["track", "src"],
  ["embed", "src"],
  ["iframe", "src"],
  ["input", "src"],
  ["object", "data"],
  ["link", "href"],
  ["a", "href"],
];

/**
 * Applies `mapUrl` to every resource reference in the document: element attributes such as
 * `src`/`href`/`srcset`, `<style>` blocks and inline `style` attributes.
 */
export const rewriteHtmlUrls = ($: CheerioAPI, mapUrl: UrlMapper): void => {
  for (const [selector, attribute] of URL_ATTRIBUTES) {
    $(`${selector}[${attribute}]`).each((_, element) => {
      const value = $(element).attr(attribute) as string;
      const mapped = mapUrl(value);
      if (mapped !== undefined) {
        $(element).attr(attribute, mapped);
      }
    });
  }

  $("img[srcset], source[srcset]").each((_, element) => {
    const srcset = $(element).attr("srcset") as string;
    const rewritten = srcset
      .split(",")
      .map((candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        const mapped = url ? mapUrl(url) : undefined;
        return [mapped ?? url, ...descriptor].join(" ");
      })
      .join(", ");
    $(element).attr("srcset", rewritten);
  });

  $("style").each((_, element) => {
    const css = $(element).html() ?? "";
    $(element).text(rewriteCssUrls(css, mapUrl));
  });

  $("[style]").each((_, element) => {
    const css = $(element).attr("style") as string;
    $(element).attr("style", rewriteCssUrls(css, mapUrl));
  });
};
