import * as assert from "assert/strict";
import * as path from "path";

import { expandPath, resolveOutputPath, stripExtension } from "../../lib/paths";

describe("paths", function () {
  const home = path.resolve("/home/user");
  const workspaceFolder = path.resolve("/work/project");
  const fileDir = path.join(workspaceFolder, "docs");
  const context = { homeDir: home, workspaceFolder, fileDir };

  describe("expandPath", function () {
    it("expands ~", function () {
      assert.equal(expandPath("~/exports", context), path.join(home, "exports"));
    });

    it("expands ${workspaceFolder}", function () {
      assert.equal(
        expandPath("${workspaceFolder}/out", context),
        path.join(workspaceFolder, "out")
      );
    });

    it("resolves relative paths against the Markdown file's folder", function () {
      assert.equal(expandPath("../pdf", context), path.join(workspaceFolder, "pdf"));
    });

    it("falls back to the workspace folder, then home, for unsaved files", function () {
      assert.equal(
        expandPath("out", { workspaceFolder, homeDir: home }),
        path.join(workspaceFolder, "out")
      );
      assert.equal(expandPath("out", { homeDir: home }), path.join(home, "out"));
    });

    it("keeps absolute paths", function () {
      const absolute = path.resolve("/tmp/exports");
      assert.equal(expandPath(absolute, context), absolute);
    });
  });

  describe("stripExtension", function () {
    it("removes only the last extension", function () {
      assert.equal(stripExtension("notes.v2.md"), "notes.v2");
      assert.equal(stripExtension("README"), "README");
    });
  });

  describe("resolveOutputPath", function () {
    const sourcePath = path.join(fileDir, "report.final.md");

    it("defaults to the source folder and name", function () {
      assert.equal(
        resolveOutputPath({
          sourcePath,
          outputHome: "",
          outputFilename: "",
          extension: "pdf",
          context,
        }),
        path.join(fileDir, "report.final.pdf")
      );
    });

    it("uses outputHome and outputFilename", function () {
      assert.equal(
        resolveOutputPath({
          sourcePath,
          outputHome: "${workspaceFolder}/exports",
          outputFilename: "Résumé",
          extension: "html",
          context,
        }),
        path.join(workspaceFolder, "exports", "Résumé.html")
      );
    });

    it("doesn't double the extension if outputFilename includes it", function () {
      assert.equal(
        resolveOutputPath({
          sourcePath,
          outputHome: "",
          outputFilename: "cv.PDF",
          extension: "pdf",
          context,
        }),
        path.join(fileDir, "cv.pdf")
      );
    });
  });
});
