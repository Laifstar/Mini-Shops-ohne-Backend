/*
 * Locates the installed Chrome for puppeteer-core.
 *
 * puppeteer-core deliberately does not download its own browser, so the QA
 * scripts and tests run against the Chrome that is already on the machine.
 * Set CHROME_PATH if Chrome lives somewhere unusual.
 */
import { existsSync } from "node:fs";

export const CHROME_PATH = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((path) => path && existsSync(path));
