import * as fs from "fs";
import * as vscode from "vscode";
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  Browser as BrowserKind,
  detectBrowserPlatform,
  getInstalledBrowsers,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";

import { findInstalledBrowser } from "../lib/browserLocator";
import { expandPath } from "../lib/paths";
import { SETTINGS_SECTION } from "../export/settings";

export interface BrowserOptions {
  /** The `executablePath` setting (may be empty). */
  executablePath: string;
  /** Where a downloaded browser is kept (the extension's global storage). */
  storageDir: string;
  log: (message: string) => void;
}

/** Thrown when the user declines to pick or download a browser. Not worth an error message. */
export class BrowserUnavailableError extends Error {}

// Launching a browser is the slowest part of an export, so keep one around between exports.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

let current: { browser: Promise<Browser>; executablePath: string } | undefined;
let idleTimer: NodeJS.Timeout | undefined;
let openPages = 0;

/**
 * Runs `fn` with a fresh page in a shared headless browser, launching one if needed.
 */
export const withPage = async <T>(
  options: BrowserOptions,
  fn: (page: Page) => Promise<T>
): Promise<T> => {
  clearIdleTimer();
  openPages++;
  try {
    const browser = await getBrowser(options);
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close().catch(() => undefined);
    }
  } finally {
    openPages--;
    if (openPages === 0) {
      idleTimer = setTimeout(() => void closeBrowser(), IDLE_TIMEOUT_MS);
    }
  }
};

export const closeBrowser = async (): Promise<void> => {
  clearIdleTimer();
  const closing = current;
  current = undefined;
  if (closing) {
    const browser = await closing.browser.catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
};

const clearIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = undefined;
  }
};

const getBrowser = async (options: BrowserOptions): Promise<Browser> => {
  const executablePath = await resolveExecutablePath(options);

  if (current && current.executablePath === executablePath) {
    const browser = await current.browser.catch(() => undefined);
    if (browser?.connected) {
      return browser;
    }
  }
  await closeBrowser();

  options.log(`Launching browser: ${executablePath}`);
  const isHeadlessShell = /chrome-headless-shell/i.test(executablePath);
  const launching = puppeteer.launch({
    executablePath,
    headless: isHeadlessShell ? "shell" : true,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      // Chromium refuses to run sandboxed as root (e.g. in some containers).
      ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []),
    ],
  });
  const entry = { browser: launching, executablePath };
  current = entry;

  try {
    const browser = await launching;
    browser.on("disconnected", () => {
      if (current === entry) {
        current = undefined;
      }
    });
    return browser;
  } catch (error) {
    if (current === entry) {
      current = undefined;
    }
    throw new Error(
      `Couldn't start the browser at "${executablePath}": ${(error as Error).message}`
    );
  }
};

/**
 * Finds a browser to render with: the `executablePath` setting, else an installed Chrome, Edge or
 * Chromium, else a copy we downloaded earlier, else (with the user's say-so) a fresh download.
 */
const resolveExecutablePath = async (options: BrowserOptions): Promise<string> => {
  if (options.executablePath.trim()) {
    const configured = expandPath(options.executablePath, {});
    if (!fs.existsSync(configured)) {
      throw new Error(
        `The browser set in "${SETTINGS_SECTION}.executablePath" doesn't exist: ${configured}`
      );
    }
    return configured;
  }

  const installed = findInstalledBrowser();
  if (installed) {
    return installed;
  }

  const downloaded = await findDownloadedBrowser(options.storageDir);
  if (downloaded) {
    return downloaded;
  }

  return promptForBrowser(options);
};

const findDownloadedBrowser = async (cacheDir: string): Promise<string | undefined> => {
  try {
    const browsers = await getInstalledBrowsers({ cacheDir });
    return browsers
      .filter((b) => b.browser === BrowserKind.CHROMEHEADLESSSHELL)
      .map((b) => b.executablePath)
      .find((p) => fs.existsSync(p));
  } catch {
    return undefined;
  }
};

const promptForBrowser = async (options: BrowserOptions): Promise<string> => {
  const download = "Download Chromium";
  const choose = "Choose Browser…";
  const choice = await vscode.window.showWarningMessage(
    "Exporting to PDF needs Chrome, Edge or Chromium, and none was found. " +
      "Download a private copy of headless Chromium (about 100 MB), or choose a browser yourself?",
    { modal: true },
    download,
    choose
  );

  if (choice === choose) {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Use This Browser",
      title: "Choose a Chromium-based browser (Chrome, Edge, Chromium, Brave)",
    });
    if (!picked?.length) {
      throw new BrowserUnavailableError("No browser chosen.");
    }
    await vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .update("executablePath", picked[0].fsPath, vscode.ConfigurationTarget.Global);
    return picked[0].fsPath;
  }

  if (choice !== download) {
    throw new BrowserUnavailableError("No browser available.");
  }

  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error(
      "Chromium can't be downloaded for this platform. Set an executablePath instead."
    );
  }

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Markdown PDF Plus: Downloading Chromium",
    },
    async (progress) => {
      const buildId = await resolveBuildId(BrowserKind.CHROMEHEADLESSSHELL, platform, "stable");
      let reported = 0;
      const installed = await install({
        browser: BrowserKind.CHROMEHEADLESSSHELL,
        buildId,
        platform,
        cacheDir: options.storageDir,
        downloadProgressCallback: (downloaded, total) => {
          const percent = total ? Math.floor((downloaded / total) * 100) : 0;
          if (percent > reported) {
            progress.report({ increment: percent - reported, message: `${percent}%` });
            reported = percent;
          }
        },
      });
      options.log(`Downloaded Chromium ${buildId} to ${installed.executablePath}`);
      return installed.executablePath;
    }
  );
};
