/*
 * Acceptance criteria of issue #2 "Produktliste anzeigen".
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { launchBrowser, openShop } from "./helpers.mjs";

// Intl formats "1,99 €" with a non-breaking space; spelling it out keeps the
// expected values readable.
const euro = (amount) => `${amount} €`;

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

const readCards = () =>
  page.$$eval(".product-card", (cards) =>
    cards.map((card) => ({
      name: card.querySelector(".product-card__title")?.textContent.trim(),
      price: card.querySelector(".price")?.textContent.trim(),
      unitPrice: card.querySelector(".unit-price")?.textContent.trim(),
      hasImage: Boolean(card.querySelector(".product-card__media svg.can")),
      imageHidden: card.querySelector(".product-card__media svg")?.getAttribute("aria-hidden"),
      tags: [...card.querySelectorAll(".tag")].map((tag) => tag.textContent.trim()),
    }))
  );

describe("Issue #2: Produktliste", () => {
  it("zeigt mindestens drei Beispielprodukte an", async () => {
    const cards = await readCards();
    assert.ok(cards.length >= 3, `nur ${cards.length} Produkte sichtbar`);
  });

  it("jedes Produkt hat Name, Preis und Bild", async () => {
    const cards = await readCards();
    // Without this guard the loop below would pass on an empty list.
    assert.ok(cards.length > 0, "keine Produktkarten gefunden");
    for (const card of cards) {
      assert.ok(card.name, "Name fehlt");
      assert.match(card.price, /^\d+,\d{2} €$/, `Preis von ${card.name}`);
      assert.ok(card.hasImage, `Bild fehlt bei ${card.name}`);
      // The can is decoration; name and price carry the information.
      assert.equal(card.imageHidden, "true");
    }
  });

  it("erzeugt die Produkte aus dem JavaScript-Array", async () => {
    // PRODUCTS is the global constant declared in js/data.js.
    const fromData = await page.evaluate(() => PRODUCTS.map((product) => product.name));
    const shown = (await readCards()).map((card) => card.name);
    assert.deepEqual(shown, fromData, "gleiche Produkte in gleicher Reihenfolge wie im Array");

    // Counter-check: the HTML file itself contains no product card, so the
    // list can only come from the script.
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    assert.doesNotMatch(html, /DOPPIO Zero|Mango-Chili/);
  });

  it("zeigt Preis und Grundpreis korrekt formatiert", async () => {
    const original = (await readCards()).find((card) => card.name === "DOPPIO Original");
    assert.equal(original.price, euro("1,99"));
    // 1,99 € for 150 ml → 13,266… € per litre, rounded to the cent.
    assert.equal(original.unitPrice, `${euro("13,27")} / 1 l`);
  });

  it("kennzeichnet Bestseller und zuckerfreie Sorten", async () => {
    const cards = await readCards();
    assert.deepEqual(cards.find((card) => card.name === "DOPPIO Original").tags, ["Bestseller"]);
    assert.deepEqual(cards.find((card) => card.name === "DOPPIO Zero").tags, ["zuckerfrei"]);
  });

  it("ordnet die Karten übersichtlich in 1, 2 oder 3 Spalten an", async () => {
    const columnsAt = async (width) => {
      await page.setViewport({ width, height: 900 });
      return page.$eval("#product-grid", (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    };
    assert.equal(await columnsAt(390), 1, "Smartphone");
    assert.equal(await columnsAt(768), 2, "Tablet");
    assert.equal(await columnsAt(1280), 3, "Desktop");
  });

  it("nennt den Pfand aus denselben Daten wie die Preise", async () => {
    // Review finding N1 from PR #6: the deposit must not be maintained twice.
    const note = await page.$eval("[data-deposit]", (element) => element.textContent);
    const fromData = await page.evaluate(() => DEPOSIT_PER_CAN_CENTS);
    assert.equal(fromData, 25);
    assert.equal(note, euro("0,25"));
  });

  it("lädt ohne Fehler oder Warnungen in der Konsole", () => {
    assert.deepEqual(consoleProblems, []);
  });
});
