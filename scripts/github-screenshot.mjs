/*
 * Screenshots of GitHub pages for the process documentation: the project
 * board, issues with their comments, pull requests.
 *
 *   npm run screenshot:github -- board  board-start
 *   npm run screenshot:github -- issue:1 issue-1-abschluss
 *   npm run screenshot:github -- pr:6   pr-6-review
 *
 * Files get a running number (01-, 02-, …) in docs/screenshots/prozess/, so
 * the folder reads like a timeline of the project.
 *
 * The browser is not logged in, which only works because the repository and
 * the board are public. GitHub then shows "Sign in" buttons instead of edit
 * controls; the global navigation bar is cropped away, the rest is unchanged.
 */
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { CHROME_PATH } from "./chrome-path.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "docs/screenshots/prozess");
const REPO_URL = "https://github.com/Laifstar/Mini-Shops-ohne-Backend";
const BOARD_URL = "https://github.com/users/Laifstar/projects/2/views/2";

function resolveTarget(target) {
  if (target === "board") return { url: BOARD_URL, fullPage: false };
  if (target === "issues") return { url: `${REPO_URL}/issues?q=is%3Aissue`, fullPage: true };
  const match = /^(issue|pr|pr-files):(\d+)$/.exec(target);
  if (match) {
    const [, kind, number] = match;
    const path = { issue: `issues/${number}`, pr: `pull/${number}`, "pr-files": `pull/${number}/files` }[kind];
    return { url: `${REPO_URL}/${path}`, fullPage: true };
  }
  if (/^https:\/\/github\.com\//.test(target)) return { url: target, fullPage: true };
  return null;
}

const [target, name] = process.argv.slice(2);
const resolved = target && resolveTarget(target);
if (!resolved || !/^[a-z0-9-]+$/.test(name ?? "")) {
  console.error("Aufruf: npm run screenshot:github -- <board|issues|issue:N|pr:N|pr-files:N|URL> <name-in-kleinbuchstaben>");
  process.exit(2);
}
if (!CHROME_PATH) {
  console.error("Kein Chrome gefunden. Bitte den Pfad per CHROME_PATH angeben.");
  process.exit(2);
}

mkdirSync(OUT_DIR, { recursive: true });
const lastNumber = Math.max(0, ...readdirSync(OUT_DIR).map((file) => Number.parseInt(file, 10) || 0));
const file = join(OUT_DIR, `${String(lastNumber + 1).padStart(2, "0")}-${name}.png`);

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
try {
  const page = await browser.newPage();
  // The board needs the width for four status columns side by side.
  await page.setViewport({ width: target === "board" ? 1600 : 1280, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  const response = await page.goto(resolved.url, { waitUntil: "networkidle2", timeout: 60000 });
  if (!response?.ok()) throw new Error(`GitHub antwortet mit HTTP ${response?.status()} für ${resolved.url}`);
  // GitHub renders issues, pull requests and boards client-side after load.
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Crop the global navigation (logo, "Sign in"); it says nothing about the project.
  const top = await page.evaluate(() => Math.ceil(document.querySelector("header")?.getBoundingClientRect().bottom ?? 0));
  const { width, height } = page.viewport();
  const bottom = resolved.fullPage ? await page.evaluate(() => document.documentElement.scrollHeight) : height;
  await page.screenshot({
    path: file,
    clip: { x: 0, y: top, width, height: bottom - top },
    captureBeyondViewport: resolved.fullPage,
  });
  console.log(`Gespeichert: ${file.slice(ROOT.length)}`);
} finally {
  await browser.close();
}
