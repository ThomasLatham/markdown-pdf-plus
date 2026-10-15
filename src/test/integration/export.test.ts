import * as assert from "assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const fixtures = path.resolve(__dirname, "../../../src/test/fixtures");
const settings = () => vscode.workspace.getConfiguration("markdown-pdf-plus");

const exportPdf = (uri?: vscode.Uri) =>
  vscode.commands.executeCommand<string | undefined>("markdown-pdf-plus.export.pdf", uri);
const exportHtml = (uri?: vscode.Uri) =>
  vscode.commands.executeCommand<string | undefined>("markdown-pdf-plus.export.html", uri);

const open = async (name: string) => {
  const doc = await vscode.workspace.openTextDocument(path.join(fixtures, name));
  await vscode.window.showTextDocument(doc);
  return doc;
};

/** The page sizes, in points, of a PDF made by Chrome. */
const pageSizes = (pdfPath: string): string[] =>
  Array.from(
    fs.readFileSync(pdfPath, "latin1").matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)
  ).map(([, width, height]) => `${Math.round(Number(width))}x${Math.round(Number(height))}`);

describe("export commands", function () {
  let outputDir: string;

  before(async function () {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "mpp-test-"));
    await settings().update("outputHome", outputDir, vscode.ConfigurationTarget.Global);
  });

  afterEach(async function () {
    for (const key of ["outputFilename", "pageSize", "CSSRaw", "CSSPath"]) {
      await settings().update(key, undefined, vscode.ConfigurationTarget.Global);
    }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  after(async function () {
    await settings().update("outputHome", undefined, vscode.ConfigurationTarget.Global);
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  describe("Export PDF", function () {
    it("exports the active Markdown file", async function () {
      await open("sample.md");
      const output = await exportPdf();

      assert.equal(output, path.join(outputDir, "sample.pdf"));
      assert.equal(
        fs
          .readFileSync(output as string)
          .subarray(0, 5)
          .toString(),
        "%PDF-"
      );
      // A4 by default.
      assert.deepEqual(new Set(pageSizes(output as string)), new Set(["595x842"]));
    });

    it("uses the pageSize and outputFilename settings", async function () {
      await settings().update("pageSize", "letter", vscode.ConfigurationTarget.Global);
      await settings().update("outputFilename", "renamed", vscode.ConfigurationTarget.Global);
      const output = await exportPdf(vscode.Uri.file(path.join(fixtures, "sample.md")));

      assert.equal(output, path.join(outputDir, "renamed.pdf"));
      assert.deepEqual(new Set(pageSizes(output as string)), new Set(["612x792"]));
    });

    it("still exports when a Mermaid diagram is invalid", async function () {
      const output = await exportPdf(vscode.Uri.file(path.join(fixtures, "broken-mermaid.md")));
      assert.ok(output && fs.existsSync(output));
    });

    it("refuses files that aren't Markdown", async function () {
      await open("plain.txt");
      assert.equal(await exportPdf(), undefined);
    });
  });

  describe("Export HTML", function () {
    let html: string;

    before(async function () {
      await settings().update(
        "CSSRaw",
        "body { --from-css-raw: 1; }",
        vscode.ConfigurationTarget.Global
      );
      await open("sample.md");
      const output = await exportHtml();
      assert.equal(output, path.join(outputDir, "sample.html"));
      html = fs.readFileSync(output as string, "utf8");
    });

    it("renders Mermaid diagrams to inline SVG", function () {
      assert.equal((html.match(/<svg[^>]+id="mpp-mermaid-\d"/g) ?? []).length, 2);
      assert.doesNotMatch(html, /<pre class="mermaid/);
    });

    it("links local resources relative to the exported file", function () {
      const relative = path
        .relative(outputDir, fixtures)
        .split(path.sep)
        .map(encodeURIComponent)
        .join("/");
      assert.match(html, new RegExp(`<img src="${relative}/img%20dir/my%20icon.png"`));
      assert.match(html, new RegExp(`<link rel="stylesheet" href="${relative}/style.css">`));
      assert.match(html, /<a href="#second-section">/);
    });

    it("renders task lists", function () {
      assert.equal((html.match(/class="task-list-item-checkbox"/g) ?? []).length, 2);
    });

    it("includes CSS from settings", function () {
      assert.match(html, /--from-css-raw: 1;/);
    });

    it("doesn't include VS Code preview markup", function () {
      // (VS Code's preview stylesheet mentions these too, so only check the content.)
      const body = html.slice(html.indexOf("<body"));
      assert.doesNotMatch(body, /data-line=|"code-line|markdown-mermaid/);
    });
  });
});
