import * as os from "os";
import * as path from "path";

export interface PathContext {
  /** Directory of the Markdown file being exported, if it has been saved. */
  fileDir?: string;
  /** Root of the workspace folder containing the Markdown file, if any. */
  workspaceFolder?: string;
  homeDir?: string;
}

/**
 * Expands a user-supplied path from settings: supports `~`, `${workspaceFolder}`,
 * `${fileDirname}` and `${userHome}`, and resolves relative paths against the Markdown file's
 * directory (or the workspace folder, or the home directory, in that order of preference).
 */
export const expandPath = (input: string, context: PathContext): string => {
  const home = context.homeDir ?? os.homedir();
  let expanded = input
    .trim()
    .replace(/\$\{workspaceFolder\}/g, context.workspaceFolder ?? context.fileDir ?? home)
    .replace(/\$\{fileDirname\}/g, context.fileDir ?? context.workspaceFolder ?? home)
    .replace(/\$\{userHome\}/g, home);

  if (expanded === "~" || expanded.startsWith("~/") || expanded.startsWith("~\\")) {
    expanded = path.join(home, expanded.slice(1));
  }

  if (path.isAbsolute(expanded)) {
    return path.normalize(expanded);
  }
  return path.resolve(context.fileDir ?? context.workspaceFolder ?? home, expanded);
};

/** The file name without its final extension (`notes.v2.md` → `notes.v2`). */
export const stripExtension = (fileName: string): string => {
  const parsed = path.parse(fileName);
  return parsed.ext ? parsed.name : parsed.base;
};

export interface OutputPathOptions {
  /** Absolute path of the Markdown source file. */
  sourcePath: string;
  /** The `outputHome` setting (may be empty). */
  outputHome: string;
  /** The `outputFilename` setting (may be empty). */
  outputFilename: string;
  /** Extension of the exported file, without the dot (e.g. `"pdf"`). */
  extension: string;
  context: PathContext;
}

/**
 * Works out where an exported file should be written.
 */
export const resolveOutputPath = (options: OutputPathOptions): string => {
  const { sourcePath, outputHome, outputFilename, extension, context } = options;

  const dir = outputHome.trim() ? expandPath(outputHome, context) : path.dirname(sourcePath);

  let name = outputFilename.trim();
  if (name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    name = name.slice(0, -(extension.length + 1));
  }
  if (!name) {
    name = stripExtension(path.basename(sourcePath));
  }

  return path.join(dir, `${name}.${extension}`);
};
