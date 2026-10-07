/*
 * Acceptance criteria of issue #11 "Warenkorb ansehen und bearbeiten".
 * The cart is prepared via localStorage (the format of js/cart.js), which is
 * faster than clicking through the modal; adding via the UI is covered by
 * the tests of issue #10.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { launchBrowser, openShop } from "./helpers.mjs";

const euro = (amount) => `${amount} €`;

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

async function prepareCart(quantities) {
  await page.evaluate((value) => localStorage.setItem("doppio-cart-v1", JSON.stringify(value)), quantities);
  await page.reload();
}

async function openCart() {
  await page.click("#cart-button");
  await page.waitForSelector("#cart-dialog[open]");
  // Interact only after the fade-in, like a person would.
  await page.waitForFunction(() => document.getAnimations().length === 0);
}

// Collapse ordinary whitespace only: prices contain a non-breaking space.
const text = (selector) => page.$eval(selector, (element) => element.textContent.replace(/[ \t\r\n]+/g, " ").trim());
const isShown = (selector) => page.$eval(selector, (element) => element.checkVisibility());
const lineFor = (productId) => `#cart-dialog .cart-line[data-product-id="${productId}"]`;
const status = () => text('#cart-dialog [data-field="status"]');

describe("Issue #11: Warenkorb ansehen und bearbeiten", () => {
  it("ein Klick auf das Warenkorb-Symbol öffnet den Warenkorb", async () => {
    const button = await page.$eval("#cart-button", (element) => ({
      tag: element.tagName,
      popup: element.getAttribute("aria-haspopup"),
    }));
    assert.deepEqual(button, { tag: "BUTTON", popup: "dialog" });
    await openCart();
    assert.equal(await text("#cart-dialog-title"), "Warenkorb");
  });

  it("ein leerer Warenkorb zeigt einen freundlichen Hinweis statt einer leeren Liste", async () => {
    await openCart();
    assert.ok(await isShown('#cart-dialog [data-field="empty"]'));
    assert.match(await text('#cart-dialog [data-field="empty"]'), /noch leer/);
    for (const field of ["lines", "summary", "actions"]) {
      assert.equal(await isShown(`#cart-dialog [data-field="${field}"]`), false, `${field} ausgeblendet`);
    }
  });

  it("jede Zeile zeigt Produkt, Preis pro Dose, Menge und Zeilensumme", async () => {
    await prepareCart({ original: 3 });
    await openCart();
    const line = await page.$eval(lineFor("original"), (element) => {
      const field = (name) => element.querySelector(`[data-field="${name}"]`).textContent.trim();
      return { name: field("name"), unit: field("unitPrice"), quantity: field("quantity"), total: field("lineTotal") };
    });
    assert.deepEqual(line, {
      name: "DOPPIO Original",
      unit: `${euro("1,99")} pro Dose`,
      quantity: "3",
      total: euro("5,97"),
    });
  });

  it("Zwischensumme, Pfand und Gesamtsumme stimmen", async () => {
    await prepareCart({ original: 3, crema: 2 });
    await openCart();
    // 3 × 1,99 + 2 × 2,49 = 10,95 €; 5 cans × 0,25 € deposit = 1,25 €.
    assert.equal(await text('#cart-dialog [data-field="subtotal"]'), euro("10,95"));
    assert.equal(await text('#cart-dialog [data-field="depositNote"]'), `(5 × ${euro("0,25")})`);
    assert.equal(await text('#cart-dialog [data-field="deposit"]'), euro("1,25"));
    assert.equal(await text('#cart-dialog [data-field="total"]'), euro("12,20"));
  });

  it("+ und − ändern Menge, Summen und Header und werden angesagt", async () => {
    await prepareCart({ zero: 1 });
    await openCart();
    await page.click(`${lineFor("zero")} [data-action="increase"]`);
    assert.equal(await text(`${lineFor("zero")} [data-field="quantity"]`), "2");
    assert.equal(await text('#cart-dialog [data-field="total"]'), euro("4,48"));
    assert.equal(await text("[data-cart-count]"), "2");
    assert.equal(await status(), "DOPPIO Zero: 2 Dosen");

    await page.click(`${lineFor("zero")} [data-action="decrease"]`);
    assert.equal(await status(), "DOPPIO Zero: 1 Dose", "Einzahl bei einer Dose");
  });

  it("− ist bei 1 und + bei 24 gesperrt, ohne den Fokus zu verlieren", async () => {
    await prepareCart({ original: 1, crema: 24 });
    await openCart();
    const disabled = async (productId, action) =>
      page.$eval(`${lineFor(productId)} [data-action="${action}"]`, (button) => button.getAttribute("aria-disabled"));
    assert.equal(await disabled("original", "decrease"), "true");
    assert.equal(await disabled("crema", "increase"), "true");

    // A locked button stays focusable (aria-disabled, not disabled) and a
    // click on it changes nothing.
    await page.focus(`${lineFor("crema")} [data-action="increase"]`);
    await page.keyboard.press("Enter");
    assert.equal(await text(`${lineFor("crema")} [data-field="quantity"]`), "24");
    const focusedAction = await page.evaluate(() => document.activeElement.dataset.action);
    assert.equal(focusedAction, "increase");
  });

  it("eine Sorte lässt sich entfernen und der ganze Warenkorb leeren", async () => {
    await prepareCart({ original: 2, zero: 1 });
    await openCart();
    await page.click(`${lineFor("original")} [data-action="remove"]`);
    assert.equal(await page.$(lineFor("original")), null);
    assert.equal(await status(), "DOPPIO Original entfernt");
    assert.equal(await text("[data-cart-count]"), "1");

    await page.click('#cart-dialog [data-action="clear-cart"]');
    assert.equal(await status(), "Warenkorb geleert");
    assert.ok(await isShown('#cart-dialog [data-field="empty"]'));
    assert.equal(await text("[data-cart-count]"), "0");
    // The focused button disappeared; focus must not fall back to <body>.
    assert.equal(await page.evaluate(() => document.activeElement.id), "cart-dialog-title");
  });

  it("„Zur Kasse“ erklärt, dass in der Demo nichts bestellt wird", async () => {
    await prepareCart({ original: 1 });
    await openCart();
    await page.click('#cart-dialog [data-action="checkout"]');
    assert.match(await status(), /Demo.*nichts bestellt/);
    assert.equal(await page.$eval('#cart-dialog [data-field="status"]', (element) => element.getAttribute("role")), "status");
    assert.equal(await text("[data-cart-count]"), "1", "Warenkorb bleibt unverändert");
  });

  it("der Warenkorb schließt wie das Detailmodal und gibt den Fokus zurück", async () => {
    for (const close of ["button", "backdrop", "escape"]) {
      await openCart();
      if (close === "button") await page.click("#cart-dialog .dialog__close");
      if (close === "backdrop") await page.mouse.click(4, 4);
      if (close === "escape") await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("#cart-dialog").open && document.activeElement.id === "cart-button"
      );
    }
  });

  it("Änderungen im Warenkorb bleiben nach dem Neuladen erhalten", async () => {
    await prepareCart({ "mango-chili": 2 });
    await openCart();
    await page.click(`${lineFor("mango-chili")} [data-action="increase"]`);
    await page.reload();
    assert.equal(await text("[data-cart-count]"), "3");
  });
});
