/*
 * Shared setup for the browser tests: one headless Chrome per test file,
 * a fresh page per test, opened via file:// exactly like the customer opens
 * the demo (double-click on index.html).
 *
 * Every page records console errors and warnings, so each issue's tests can
 * assert a clean console (checklist item B4) without repeating the wiring.
 */
import puppeteer from "puppeteer-core";
import { CHROME_PATH } from "../scripts/chrome-path.mjs";

export const PAGE_URL = new URL("../index.html", import.meta.url).href;

export async function launchBrowser() {
  if (!CHROME_PATH) throw new Error("Kein Chrome gefunden. Bitte den Pfad per CHROME_PATH angeben.");
  return puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
}

/** Opens index.html in a new page; `consoleProblems` fills up while the page lives. */
export async function openShop(browser, viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage();
  const consoleProblems = [];
  page.on("console", (message) => {
    if (["error", "warn", "warning"].includes(message.type())) consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => consoleProblems.push(error.message));
  await page.setViewport(viewport);
  await page.goto(PAGE_URL, { waitUntil: "load" });
  return { page, consoleProblems };
}
