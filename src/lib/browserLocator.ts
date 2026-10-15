import * as fs from "fs";
import * as path from "path";

/**
 * Places where Chrome, Edge or Chromium are commonly installed, most preferred first.
 */
export const candidateBrowserPaths = (
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): string[] => {
  switch (platform) {
    case "win32": {
      const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(
        (root): root is string => !!root
      );
      const suffixes = [
        "Google\\Chrome\\Application\\chrome.exe",
        "Microsoft\\Edge\\Application\\msedge.exe",
        "Chromium\\Application\\chrome.exe",
        "BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      ];
      return suffixes.flatMap((suffix) => roots.map((root) => path.win32.join(root, suffix)));
    }
    case "darwin": {
      const apps = [
        "Google Chrome.app/Contents/MacOS/Google Chrome",
        "Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "Chromium.app/Contents/MacOS/Chromium",
        "Brave Browser.app/Contents/MacOS/Brave Browser",
      ];
      const roots = ["/Applications", env.HOME ? path.posix.join(env.HOME, "Applications") : ""];
      return apps.flatMap((app) => roots.filter(Boolean).map((root) => path.posix.join(root, app)));
    }
    default: {
      const names = [
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "microsoft-edge",
        "microsoft-edge-stable",
        "brave-browser",
      ];
      const dirs = (env.PATH ?? "").split(":").filter(Boolean);
      for (const fallback of ["/usr/bin", "/usr/local/bin", "/snap/bin"]) {
        if (!dirs.includes(fallback)) {
          dirs.push(fallback);
        }
      }
      return names.flatMap((name) => dirs.map((dir) => path.posix.join(dir, name)));
    }
  }
};

/**
 * Returns the first installed Chromium-based browser, if there is one.
 */
export const findInstalledBrowser = (
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  exists: (p: string) => boolean = fs.existsSync
): string | undefined => candidateBrowserPaths(platform, env).find((p) => exists(p));
