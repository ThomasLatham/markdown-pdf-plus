import * as assert from "assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "url";
import { load } from "cheerio";

import {
  createLocalResolver,
  isNonLocalUrl,
  rewriteCssUrls,
  rewriteHtmlUrls,
  toFileUrl,
  toRelativeUrl,
} from "../../lib/urls";

describe("urls", function () {
  let root: string;

  before(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "mpp-urls-"));
    fs.mkdirSync(path.join(root, "img dir"));
    fs.writeFileSync(path.join(root, "img dir", "my icon.png"), "");
    fs.writeFileSync(path.join(root, "100%.png"), "");
  });

  after(function () {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe("isNonLocalUrl", function () {
    for (const url of [
      "https://example.com/a.png",
      "http://example.com",
      "//cdn.example.com/a.css",
      "data:image/png;base64,AAAA",
      "mailto:someone@example.com",
      "#section",
      "",
    ]) {
      it(`treats "${url}" as non-local`, function () {
        assert.equal(isNonLocalUrl(url), true);
      });
    }

    for (const url of [
      "a.png",
      "./a.png",
      "../a.png",
      "/a.png",
      "C:\\a.png",
      "c:/a.png",
      "file:///a.png",
    ]) {
      it(`treats "${url}" as local`, function () {
        assert.equal(isNonLocalUrl(url), false);
      });
    }
  });

  describe("createLocalResolver", function () {
    it("resolves decoded paths (as rendered by VS Code)", function () {
      const ref = createLocalResolver(root)("img dir/my icon.png");
      assert.deepEqual(ref, { filePath: path.join(root, "img dir", "my icon.png"), suffix: "" });
    });

    it("resolves percent-encoded paths", function () {
      const ref = createLocalResolver(root)("img%20dir/my%20icon.png");
      assert.equal(ref?.filePath, path.join(root, "img dir", "my icon.png"));
    });

    it("prefers the literal path when decoding it would point elsewhere", function () {
      const ref = createLocalResolver(root)("100%.png");
      assert.equal(ref?.filePath, path.join(root, "100%.png"));
    });

    it("keeps the query string and fragment", function () {
      const ref = createLocalResolver(root)("doc.svg?v=2#layer");
      assert.deepEqual(ref, { filePath: path.join(root, "doc.svg"), suffix: "?v=2#layer" });
    });

    it("resolves root-relative paths against the root directory", function () {
      const ref = createLocalResolver(path.join(root, "img dir"), root)("/img dir/my icon.png");
      assert.equal(ref?.filePath, path.join(root, "img dir", "my icon.png"));
    });

    it("resolves file: URLs", function () {
      const file = path.join(root, "img dir", "my icon.png");
      const ref = createLocalResolver("/elsewhere")(pathToFileURL(file).href);
      assert.equal(ref?.filePath, file);
    });

    it("ignores remote URLs", function () {
      assert.equal(createLocalResolver(root)("https://example.com/a.png"), undefined);
    });
  });

  describe("toRelativeUrl", function () {
    it("encodes each path segment", function () {
      const ref = { filePath: path.join(root, "img dir", "my icon.png"), suffix: "#x" };
      assert.equal(toRelativeUrl(ref, root), "img%20dir/my%20icon.png#x");
    });

    it("walks up directories", function () {
      const ref = { filePath: path.join(root, "a.png"), suffix: "" };
      assert.equal(toRelativeUrl(ref, path.join(root, "out", "html")), "../../a.png");
    });

    if (process.platform === "win32") {
      it("falls back to a file URL across drives", function () {
        const ref = { filePath: "D:\\pics\\a.png", suffix: "" };
        assert.equal(toRelativeUrl(ref, "C:\\docs"), toFileUrl(ref));
      });
    }
  });

  describe("rewriteCssUrls", function () {
    const upper = (url: string) => (isNonLocalUrl(url) ? undefined : url.toUpperCase());

    it("rewrites quoted and unquoted url() references", function () {
      assert.equal(
        rewriteCssUrls("a { background: url(a.png) } b { background: url('b.png') }", upper),
        "a { background: url(\"A.PNG\") } b { background: url('B.PNG') }"
      );
    });

    it("leaves data URIs and remote URLs alone", function () {
      const css =
        'a { background: url("data:image/svg+xml;utf8,<svg></svg>") } b { src: url(https://x.y/f.woff) }';
      assert.equal(rewriteCssUrls(css, upper), css);
    });

    it("rewrites @import", function () {
      assert.equal(rewriteCssUrls('@import "base.css";', upper), '@import "BASE.CSS";');
    });
  });

  describe("rewriteHtmlUrls", function () {
    const upper = (url: string) => (isNonLocalUrl(url) ? undefined : url.toUpperCase());

    it("rewrites resource attributes but not fragment links", function () {
      const $ = load(
        '<img src="a.png" srcset="a.png 1x, b.png 2x"><a href="#top">top</a><a href="x.md">x</a>' +
          '<link rel="stylesheet" href="s.css"><div style="background: url(c.png)"></div>'
      );
      rewriteHtmlUrls($, upper);
      assert.equal($("img").attr("src"), "A.PNG");
      assert.equal($("img").attr("srcset"), "A.PNG 1x, B.PNG 2x");
      assert.equal($("a").first().attr("href"), "#top");
      assert.equal($("a").last().attr("href"), "X.MD");
      assert.equal($("link").attr("href"), "S.CSS");
      assert.equal($("div").attr("style"), 'background: url("C.PNG")');
    });

    it("rewrites <style> blocks without escaping CSS", function () {
      const $ = load("<style>ul > li { background: url(d.png) }</style>");
      rewriteHtmlUrls($, upper);
      assert.match($.html(), /<style>ul > li \{ background: url\("D.PNG"\) \}<\/style>/);
    });
  });
});
