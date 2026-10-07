/*
 * Acceptance criteria of issue #10 "Produkte in den Warenkorb legen".
 * Every test starts with an empty cart: all pages of one browser share the
 * same localStorage for file:// URLs.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { launchBrowser, openShop } from "./helpers.mjs";

let browser;
let page;
let consoleProblems;

before(async () => {
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
});

beforeEach(async () => {
  ({ page, consoleProblems } = await openShop(browser));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

afterEach(async () => {
  await page.close();
  assert.deepEqual(consoleProblems, [], "die Konsole muss frei von Fehlern und Warnungen sein");
});

const cartCount = () => page.$eval("[data-cart-count]", (element) => element.textContent.trim());
const toastText = () => page.$eval("#toast", (element) => element.textContent.trim());

async function addToCart(productId, quantity) {
  await page.click(`[data-action="show-details"][data-product-id="${productId}"]`);
  await page.waitForSelector("#product-dialog[open]");
  await page.$eval("#quantity-input", (input, value) => (input.value = value), String(quantity));
  await page.click('#add-to-cart-form button[type="submit"]');
}

describe("Issue #10: Produkte in den Warenkorb legen", () => {
  it("das Modal hat ein Mengenfeld (1–24) und den Button „In den Warenkorb“", async () => {
    await page.click('[data-action="show-details"][data-product-id="original"]');
    await page.waitForSelector("#product-dialog[open]");
    const form = await page.$eval("#add-to-cart-form", (element) => {
      const input = element.querySelector("#quantity-input");
      return {
        label: element.querySelector(`label[for="${input.id}"]`)?.textContent.trim(),
        min: input.min,
        max: input.max,
        value: input.value,
        button: element.querySelector('button[type="submit"]').textContent.trim(),
      };
    });
    assert.deepEqual(form, { label: "Menge", min: "1", max: "24", value: "1", button: "In den Warenkorb" });
  });

  it("nach dem Hinzufügen schließt das Modal und eine Bestätigung nennt Menge und Produkt", async () => {
    await addToCart("original", 3);
    await page.waitForFunction(() => !document.querySelector("#product-dialog").open);
    assert.equal(await toastText(), "3 × DOPPIO Original im Warenkorb");
    assert.equal(await page.$eval("#toast", (element) => element.getAttribute("role")), "status");
  });

  it("der Header zeigt die Anzahl der Dosen über alle Sorten", async () => {
    assert.equal(await cartCount(), "0");
    await addToCart("original", 3);
    await addToCart("zero", 2);
    assert.equal(await cartCount(), "5");
    const text = await page.$eval(".cart-indicator", (element) => element.textContent.replace(/\s+/g, " ").trim());
    assert.equal(text, "Warenkorb 5 Artikel", "vollständiger Text für Screenreader");
  });

  it("mehr als 24 Dosen pro Sorte sind nicht möglich, die Bestätigung weist darauf hin", async () => {
    await addToCart("crema", 20);
    await addToCart("crema", 10);
    assert.equal(await toastText(), "Maximal 24 Dosen pro Sorte: 4 × DOPPIO Crema hinzugefügt");
    assert.equal(await cartCount(), "24");

    await addToCart("crema", 1);
    assert.equal(await toastText(), "Maximal 24 Dosen pro Sorte: DOPPIO Crema ist schon voll im Warenkorb");
    assert.equal(await cartCount(), "24");
  });

  it("ungültige Mengen hält schon das Formular auf", async () => {
    for (const invalid of ["0", "25", "2.5"]) {
      await addToCart("zero", invalid);
      assert.equal(await page.$eval("#product-dialog", (dialog) => dialog.open), true, `Menge ${invalid}: Modal bleibt offen`);
      assert.equal(await cartCount(), "0", `Menge ${invalid}: nichts hinzugefügt`);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("#product-dialog").open);
    }
  });

  it("Enter im Mengenfeld legt ebenfalls in den Warenkorb", async () => {
    await page.click('[data-action="show-details"][data-product-id="mango-chili"]');
    await page.waitForSelector("#product-dialog[open]");
    await page.focus("#quantity-input");
    await page.keyboard.press("ArrowUp"); // 1 → 2
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.querySelector("#product-dialog").open);
    assert.equal(await cartCount(), "2");
  });

  it("das Mengenfeld startet bei jedem Produkt wieder bei 1", async () => {
    await page.click('[data-action="show-details"][data-product-id="original"]');
    await page.waitForSelector("#product-dialog[open]");
    await page.$eval("#quantity-input", (input) => (input.value = "7"));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#product-dialog").open);
    await page.click('[data-action="show-details"][data-product-id="zero"]');
    await page.waitForSelector("#product-dialog[open]");
    assert.equal(await page.$eval("#quantity-input", (input) => input.value), "1");
  });

  it("der Warenkorb bleibt nach dem Neuladen erhalten", async () => {
    await addToCart("citrus-minze", 4);
    await page.reload();
    assert.equal(await cartCount(), "4");
  });

  it("kaputte oder fremde Daten im Speicher bringen den Shop nicht zum Absturz", async () => {
    for (const stored of ["kaputt{", JSON.stringify({ gibts: 3, original: 999, zero: -2 })]) {
      await page.evaluate((value) => localStorage.setItem("doppio-cart-v1", value), stored);
      await page.reload();
      // Unknown products and negative values are dropped, 999 is capped at 24.
      assert.equal(await cartCount(), stored.startsWith("{") ? "24" : "0");
    }
  });
});
