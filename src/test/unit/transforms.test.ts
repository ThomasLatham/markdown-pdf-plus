import * as assert from "assert/strict";
import { load } from "cheerio";

import { candidateBrowserPaths, findInstalledBrowser } from "../../lib/browserLocator";
import { normalizeMermaidBlocks } from "../../lib/mermaid";
import { buildPageRule } from "../../lib/pageStyle";
import { renderTaskLists } from "../../lib/taskLists";

describe("normalizeMermaidBlocks", function () {
  const canonical =
    '<div class="mermaid-diagram"><pre class="mermaid-source">graph TD\n  A --&gt; B</pre></div>';

  it("handles VS Code's built-in Mermaid output", function () {
    const $ = load(
      '<span id="markdown-mermaid" data-config="{}"></span>' +
        '<pre class="mermaid" style="all: unset;">graph TD\n  A --&gt; B</pre>'
    );
    assert.equal(normalizeMermaidBlocks($), 1);
    assert.equal($("body").html(), canonical);
  });

  it("handles the Markdown Preview Mermaid Support extension's output", function () {
    const $ = load('<div class="mermaid">graph TD\n  A --&gt; B</div>');
    assert.equal(normalizeMermaidBlocks($), 1);
    assert.equal($("body").html(), canonical);
  });

  it("handles plain fenced code blocks", function () {
    const $ = load('<pre><code class="language-mermaid">graph TD\n  A --&gt; B\n</code></pre>');
    assert.equal(normalizeMermaidBlocks($), 1);
    assert.equal($("body").html(), canonical);
  });

  it("leaves other code blocks alone", function () {
    const html = '<pre><code class="language-js">a --&gt; b</code></pre>';
    const $ = load(html);
    assert.equal(normalizeMermaidBlocks($), 0);
    assert.equal($("body").html(), html);
  });
});

describe("buildPageRule", function () {
  const settings = {
    pageSize: "a4",
    marginTop: "1cm",
    marginRight: "2cm",
    marginBottom: "",
    marginLeft: " 3cm ",
  };

  it("builds an @page rule from the settings that are set", function () {
    assert.equal(
      buildPageRule(settings),
      "@page { size: a4; margin-top: 1cm; margin-right: 2cm; margin-left: 3cm; }"
    );
  });

  it("returns nothing if no settings are set", function () {
    assert.equal(
      buildPageRule({
        pageSize: "",
        marginTop: "",
        marginRight: "",
        marginBottom: "",
        marginLeft: "",
      }),
      ""
    );
  });

  it("can't be used to inject other CSS", function () {
    assert.equal(
      buildPageRule({
        ...settings,
        pageSize: "a4; } body { display: none",
        marginTop: "",
        marginRight: "",
        marginLeft: "",
      }),
      "@page { size: a4  body  display: none; }"
    );
  });
});

describe("renderTaskLists", function () {
  it("turns [ ] and [x] items into checkboxes", function () {
    const $ = load("<ul><li>[ ] todo</li><li>[x] done</li><li>plain</li></ul>");
    renderTaskLists($);
    assert.equal(
      $("body").html(),
      '<ul class="contains-task-list">' +
        '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled=""> todo</li>' +
        '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled="" checked=""> done</li>' +
        "<li>plain</li></ul>"
    );
  });

  it("handles loose lists", function () {
    const $ = load("<ul><li><p>[X] done</p></li></ul>");
    renderTaskLists($);
    assert.equal($("input[checked]").length, 1);
    assert.equal($("p").text().trim(), "done");
  });

  it("leaves items that already have checkboxes alone", function () {
    const html = '<ul><li><input type="checkbox"> [ ] literal</li></ul>';
    const $ = load(html);
    renderTaskLists($);
    assert.equal($("body").html(), html);
  });
});

describe("browserLocator", function () {
  it("prefers Chrome over Edge on Windows", function () {
    const env = {
      PROGRAMFILES: "C:\\Program Files",
      "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
    };
    const found = findInstalledBrowser("win32", env, (p) => /chrome\.exe|msedge\.exe/.test(p));
    assert.equal(found, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
  });

  it("finds Edge when Chrome isn't installed", function () {
    const env = { "PROGRAMFILES(X86)": "C:\\Program Files (x86)" };
    const found = findInstalledBrowser("win32", env, (p) => p.endsWith("msedge.exe"));
    assert.equal(found, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");
  });

  it("searches PATH on Linux", function () {
    const candidates = candidateBrowserPaths("linux", { PATH: "/opt/bin:/usr/bin" });
    assert.ok(candidates.includes("/opt/bin/chromium"));
    assert.ok(candidates.includes("/snap/bin/chromium"));
  });

  it("looks in /Applications on macOS", function () {
    const found = findInstalledBrowser("darwin", { HOME: "/Users/me" }, (p) =>
      p.includes("Microsoft Edge")
    );
    assert.equal(found, "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
  });

  it("returns undefined when nothing is installed", function () {
    assert.equal(
      findInstalledBrowser("linux", { PATH: "" }, () => false),
      undefined
    );
  });
});
