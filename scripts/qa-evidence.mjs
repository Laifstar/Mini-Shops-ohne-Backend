/*
 * Evidence run after each issue: screenshots of the shop, an axe-core
 * accessibility check and Lighthouse (mobile and desktop).
 *
 *   npm run qa:evidence -- 3        →  docs/screenshots/issue-3/
 *
 * The output lands in one folder per issue so the pull request can link to it
 * and the documentation shows how the shop grew step by step. The run never
 * stops early: findings are written down first, then reported via exit code.
 *
 * Lighthouse refuses file:// URLs, so the page is served by a tiny static
 * server on 127.0.0.1. The shop itself must still work via file:// — the
 * browser tests in tests/ cover that.
 */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import lighthouse, { desktopConfig } from "lighthouse";
import { CHROME_PATH } from "./chrome-path.mjs";
import { states } from "./qa-states.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const AXE_PATH = join(ROOT, "node_modules/axe-core/axe.min.js");
const AXE_VERSION = JSON.parse(readFileSync(join(ROOT, "node_modules/axe-core/package.json"), "utf8")).version;

// Same rule set as the axe DevTools extension with "best practices" switched on.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
  // 390 px is a current mid-size phone; DPR 2 keeps the screenshots sharp.
  mobil: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const LIGHTHOUSE_CATEGORIES = {
  performance: "Performance",
  accessibility: "Barrierefreiheit",
  "best-practices": "Best Practices",
  seo: "SEO",
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const issue = process.argv[2];
if (!/^[1-9]\d*$/.test(issue ?? "")) {
  console.error("Aufruf: npm run qa:evidence -- <Issue-Nummer>   (z. B. npm run qa:evidence -- 3)");
  process.exit(2);
}
if (!CHROME_PATH) {
  console.error("Kein Chrome gefunden. Bitte den Pfad per CHROME_PATH angeben.");
  process.exit(2);
}

const OUT_DIR = join(ROOT, "docs/screenshots", `issue-${issue}`);
mkdirSync(OUT_DIR, { recursive: true });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

function startServer() {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = normalize(join(ROOT, path.endsWith("/") ? `${path}index.html` : path));
    // Never serve anything outside the repository (e.g. "/../").
    if (!file.startsWith(ROOT)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { "Content-Type": MIME_TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Which code the evidence belongs to; a dirty tree is stated instead of hidden.
function describeCommit() {
  try {
    const hash = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain", "--", ".", ":!docs/screenshots"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    return dirty ? `${hash} + nicht committete Änderungen` : hash;
  } catch {
    return "ohne Commit";
  }
}

async function openPage(browser, url, viewport, problems) {
  // A separate browser context per state: own localStorage, so every state
  // starts like a first-time visitor (e.g. with an empty cart), no matter
  // what earlier states did.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("console", (message) => {
    if (["error", "warn", "warning"].includes(message.type())) problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await page.setViewport(viewport);
  // Reduced motion: screenshots must not catch a transition halfway through.
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function captureStates(browser, url) {
  const runs = [];
  // Only the start state is captured as a full page. In a full-page capture
  // fixed and sticky elements (open dialog, header) land wherever the page was
  // scrolled to, so interaction states show just what the visitor sees.
  const start = { id: "start", label: "Startzustand", fullPage: true, enter: async () => {} };
  for (const state of [start, ...states]) {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      const consoleProblems = [];
      const page = await openPage(browser, url, viewport, consoleProblems);
      await state.enter(page);
      await pause(300);

      const screenshot = `${state.id}-${viewportName}.png`;
      await page.screenshot({ path: join(OUT_DIR, screenshot), fullPage: Boolean(state.fullPage) });

      await page.addScriptTag({ path: AXE_PATH });
      const axe = await page.evaluate(
        (tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] }),
        AXE_TAGS
      );
      runs.push({
        state: state.label,
        viewport: viewportName,
        screenshot,
        consoleProblems,
        passes: axe.passes.length,
        incomplete: axe.incomplete.map(({ id, help }) => ({ id, help })),
        violations: axe.violations.map(({ id, impact, help, helpUrl, nodes }) => ({
          id,
          impact,
          help,
          helpUrl,
          targets: nodes.map((node) => node.target.join(" ")),
        })),
      });
      await page.browserContext().close();
      console.log(`  ${state.label} (${viewportName}): ${axe.violations.length} axe-Verstöße`);
    }
  }
  return runs;
}

async function runLighthouse(browser, url) {
  const port = Number(new URL(browser.wsEndpoint()).port);
  const results = {};
  for (const [name, config] of [["mobil", undefined], ["desktop", desktopConfig]]) {
    const { lhr, report } = await lighthouse(
      url,
      { port, output: "html", logLevel: "error", onlyCategories: Object.keys(LIGHTHOUSE_CATEGORIES) },
      config
    );
    const reportPath = join(OUT_DIR, `lighthouse-${name}.html`);
    writeFileSync(reportPath, report);
    results[name] = Object.fromEntries(
      Object.keys(LIGHTHOUSE_CATEGORIES).map((key) => [key, Math.round(lhr.categories[key].score * 100)])
    );

    // Screenshot of the score gauges, the part that matters for the documentation.
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.goto(pathToFileURL(reportPath).href, { waitUntil: "networkidle0" });
    // Four times 100 triggers an easter egg: confetti over the gauges and a
    // forced dark theme. Switch it off for the screenshot only; the scores are
    // untouched and the saved HTML report still shows the fireworks.
    await page.evaluate(() => {
      document.querySelector(".lh-score100")?.classList.remove("lh-score100");
      document.querySelector(".lh-dark")?.classList.remove("lh-dark");
    });
    await pause(1500); // gauge arcs animate in
    const scores = await page.$(".lh-scores-header");
    await (scores ?? page).screenshot({ path: join(OUT_DIR, `lighthouse-${name}.png`) });
    await page.close();
    console.log(`  Lighthouse ${name}: ${Object.values(results[name]).join(" / ")}`);
  }
  return results;
}

function axeSummaryHtml(runs, meta) {
  const rows = runs
    .map(
      (run) => `<tr class="${run.violations.length ? "bad" : "good"}">
        <td>${escapeHtml(run.state)}</td><td>${run.viewport}</td>
        <td class="num">${run.violations.length}</td><td class="num">${run.passes}</td>
        <td class="num">${run.incomplete.length}</td></tr>`
    )
    .join("");
  const details = runs
    .filter((run) => run.violations.length)
    .map(
      (run) => `<h2>${escapeHtml(run.state)} (${run.viewport})</h2><ul>${run.violations
        .map(
          (violation) => `<li><strong>${escapeHtml(violation.id)}</strong> (${escapeHtml(violation.impact)}):
            ${escapeHtml(violation.help)}<br><code>${violation.targets.map(escapeHtml).join("</code>, <code>")}</code></li>`
        )
        .join("")}</ul>`
    )
    .join("");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><title>axe-core</title>
    <style>
      body { font: 15px/1.5 system-ui, sans-serif; margin: 24px; color: #1f2328; background: #fff; }
      h1 { font-size: 20px; margin: 0 0 4px; } p { margin: 0 0 16px; color: #59636e; }
      table { border-collapse: collapse; width: 100%; } th, td { padding: 6px 10px; border-bottom: 1px solid #d1d9e0; text-align: left; }
      th { background: #f6f8fa; } .num { text-align: right; font-variant-numeric: tabular-nums; }
      tr.good td:nth-child(3) { color: #1a7f37; font-weight: 600; } tr.bad td:nth-child(3) { color: #d1242f; font-weight: 600; }
      h2 { font-size: 16px; margin: 20px 0 6px; } code { font-size: 13px; background: #f6f8fa; padding: 1px 4px; }
    </style>
    <h1>axe-core ${AXE_VERSION}: Issue #${issue}</h1>
    <p>${escapeHtml(meta.date)} · Commit ${escapeHtml(meta.commit)} · Regeln: WCAG 2.2 A/AA + Best Practices</p>
    <table><thead><tr><th>Zustand</th><th>Ansicht</th><th class="num">Verstöße</th><th class="num">Bestanden</th>
    <th class="num">Manuell prüfen</th></tr></thead><tbody>${rows}</tbody></table>${details}</html>`;
}

function evidenceMarkdown(runs, scores, meta) {
  const scoreRows = Object.entries(scores)
    .map(([name, values]) => `| ${name === "mobil" ? "Mobil" : "Desktop"} | ${Object.values(values).join(" | ")} |`)
    .join("\n");
  const axeRows = runs
    .map((run) => `| ${run.state} | ${run.viewport} | ${run.violations.length} | ${run.passes} | ${run.incomplete.length} |`)
    .join("\n");
  const violations = runs.flatMap((run) =>
    run.violations.map((violation) => `- ${run.state} (${run.viewport}): \`${violation.id}\` ${violation.help}`)
  );
  const consoleProblems = runs.flatMap((run) =>
    run.consoleProblems.map((text) => `- ${run.state} (${run.viewport}): ${text}`)
  );
  const screenshots = runs.map((run) => `![${run.state}, ${run.viewport}](${run.screenshot})`).join("\n");

  return `# Nachweise Issue #${issue}

Erzeugt am ${meta.date} mit \`npm run qa:evidence -- ${issue}\` (Commit ${meta.commit}).

## Lighthouse 13 ([Mobil](lighthouse-mobil.html), [Desktop](lighthouse-desktop.html))

| Ansicht | ${Object.values(LIGHTHOUSE_CATEGORIES).join(" | ")} |
|---|---|---|---|---|
${scoreRows}

![Lighthouse Mobil](lighthouse-mobil.png)

## axe-core ${AXE_VERSION} (WCAG 2.2 A/AA + Best Practices)

| Zustand | Ansicht | Verstöße | Bestanden | Manuell prüfen |
|---|---|---|---|---|
${axeRows}

${violations.length ? violations.join("\n") : "Keine Verstöße."}

„Manuell prüfen“ sind Regeln, die axe nicht automatisch entscheiden kann (z. B. Kontrast auf Farbverläufen).
Details stehen in [axe.json](axe.json).

## Browserkonsole

${consoleProblems.length ? consoleProblems.join("\n") : "Keine Fehler oder Warnungen."}

## Screenshots

${screenshots}
`;
}

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });

try {
  const meta = {
    date: new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }),
    commit: describeCommit(),
  };
  console.log(`Nachweise für Issue #${issue} → docs/screenshots/issue-${issue}/`);

  const runs = await captureStates(browser, url);
  const scores = await runLighthouse(browser, url);

  writeFileSync(join(OUT_DIR, "axe.json"), `${JSON.stringify({ axeVersion: AXE_VERSION, tags: AXE_TAGS, runs }, null, 2)}\n`);
  const summary = await browser.newPage();
  await summary.setViewport({ width: 900, height: 400, deviceScaleFactor: 2 });
  await summary.setContent(axeSummaryHtml(runs, meta));
  await summary.screenshot({ path: join(OUT_DIR, "axe.png"), fullPage: true });
  writeFileSync(join(OUT_DIR, "ergebnis.md"), evidenceMarkdown(runs, scores, meta));

  const findings =
    runs.reduce((sum, run) => sum + run.violations.length + run.consoleProblems.length, 0) +
    Object.values(scores).flatMap(Object.values).filter((score) => score < 90).length;
  console.log(findings ? `Fertig mit ${findings} Befund(en), siehe ergebnis.md` : "Fertig, keine Befunde.");
  process.exitCode = findings ? 1 : 0;
} finally {
  await browser.close();
  server.close();
}
