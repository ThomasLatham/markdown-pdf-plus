// Bundles the extension into dist/extension.js and copies the browser assets it needs.
//
//   node scripts/build.mjs              development build
//   node scripts/build.mjs --production minified build, used when packaging
//   node scripts/build.mjs --watch      rebuild on change
import * as esbuild from "esbuild";
import { readdirSync, readFileSync } from "fs";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { createRequire } from "module";
import * as path from "path";

const require = createRequire(import.meta.url);
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

await mkdir("dist/media", { recursive: true });
await copyFile(require.resolve("mermaid/dist/mermaid.min.js"), "dist/media/mermaid.min.js");

const options = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  minify: production,
  sourcemap: !production,
  metafile: production,
  logLevel: "info",
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  const result = await esbuild.build(options);
  if (production) {
    await writeThirdPartyNotices(result.metafile);
  }
}

/**
 * Collects the license of every package bundled into the extension (plus Mermaid, which is
 * shipped as a separate file) into dist/ThirdPartyNotices.txt.
 */
async function writeThirdPartyNotices(metafile) {
  const packageDirs = new Set([path.dirname(require.resolve("mermaid/package.json"))]);
  for (const input of Object.keys(metafile.inputs)) {
    const match = /^(.*node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)/.exec(input);
    if (match) {
      packageDirs.add(path.resolve(match[1]));
    }
  }

  const notices = [...packageDirs]
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
      const licenseFile = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
      const text = licenseFile ? readFileSync(path.join(dir, licenseFile), "utf8").trim() : "";
      return { name: pkg.name, version: pkg.version, license: pkg.license, text };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const body = notices
    .map(
      (n) =>
        `${"-".repeat(80)}\n${n.name}@${n.version} (${n.license ?? "see below"})\n\n` +
        (n.text || `License: ${n.license}`)
    )
    .join("\n\n");

  await writeFile(
    "dist/ThirdPartyNotices.txt",
    "Markdown PDF Plus includes the following third-party software.\n\n" + body + "\n"
  );
}
