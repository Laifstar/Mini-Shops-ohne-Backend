/*
 * Acceptance criteria of issue #1 "Projektgrundlage erstellen".
 * The criterion "Der Code ist verständlich kommentiert" cannot be automated;
 * it is part of the review checklist (B2).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { launchBrowser, openShop } from "./helpers.mjs";

let browser;
let page;
let consoleProblems;

before(async () => {
  browser = await launchBrowser();
  ({ page, consoleProblems } = await openShop(browser));
});

after(async () => {
  await browser?.close();
});

describe("Issue #1: Projektgrundlage", () => {
  it("eine HTML-Datei mit deutschem Grundgerüst ist vorhanden", async () => {
    const structure = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      main: document.querySelectorAll("main").length,
      skipTarget: Boolean(document.querySelector(document.querySelector(".skip-link").getAttribute("href"))),
    }));
    assert.equal(structure.lang, "de");
    assert.match(structure.title, /DOPPIO/);
    assert.equal(structure.main, 1, "genau ein <main> als Hauptbereich");
    assert.ok(structure.skipTarget, "der Skip-Link muss ein existierendes Ziel haben");
  });

  it("eine CSS-Datei ist eingebunden und wirkt", async () => {
    // Checking the <link> alone would also pass for a wrong path, so this
    // checks that a rule from styles.css actually applies.
    const { linked, background } = await page.evaluate(() => ({
      linked: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute("href")),
      background: getComputedStyle(document.body).backgroundColor,
    }));
    assert.deepEqual(linked, ["css/styles.css"]);
    assert.equal(background, "rgb(251, 248, 244)", "Hintergrund aus dem Token --color-paper");
  });

  it("eine JavaScript-Datei ist eingebunden und stellt die Produktdaten bereit", async () => {
    const data = await page.evaluate(() => ({
      scripts: [...document.querySelectorAll("script[src]")].map((script) => script.getAttribute("src")),
      // PRODUCTS is the global constant declared in js/data.js.
      products: PRODUCTS.map(({ id, name, priceCents, description }) => ({ id, name, priceCents, description })),
    }));
    assert.ok(data.scripts.includes("js/data.js"));
    assert.ok(data.products.length >= 3, "mindestens drei Produkte vorbereitet");
    for (const product of data.products) {
      assert.ok(product.id && product.name && product.description, `vollständige Angaben für ${product.id}`);
      assert.ok(Number.isInteger(product.priceCents), `Preis von ${product.id} in ganzen Cent`);
    }
    assert.equal(new Set(data.products.map((product) => product.id)).size, data.products.length, "eindeutige IDs");
  });

  it("ein Bereich für die Produktliste ist vorhanden", async () => {
    const area = await page.evaluate(() => {
      const list = document.querySelector("#product-grid");
      const section = list?.closest("section");
      return {
        tag: list?.tagName,
        heading: document.getElementById(section?.getAttribute("aria-labelledby"))?.textContent.trim(),
        anchor: section?.id,
      };
    });
    assert.equal(area.tag, "UL");
    assert.equal(area.heading, "Unsere Sorten");
    assert.equal(area.anchor, "sorten", "Ziel für den Button „Sorten entdecken“");
  });

  it("lädt ohne Fehler oder Warnungen in der Konsole", () => {
    assert.deepEqual(consoleProblems, []);
  });
});
