/*
 * Acceptance criteria of issue #3 "Detailmodal öffnen".
 * Closing the modal by button or backdrop is issue #4; between the checks
 * here the native Esc behaviour of <dialog> is used.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { launchBrowser, openShop } from "./helpers.mjs";

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

const isOpen = () => page.$eval("#product-dialog", (dialog) => dialog.open);

async function openDetails(productId) {
  await page.click(`[data-action="show-details"][data-product-id="${productId}"]`);
  await page.waitForSelector("#product-dialog[open]");
}

async function closeWithEsc() {
  await page.keyboard.press("Escape");
  // Wait until focus is back on a "Details" button as well: the "close"
  // event that restores it runs a moment after the dialog is closed, and a
  // test that focuses something in between would have its focus stolen.
  await page.waitForFunction(
    () =>
      !document.querySelector("#product-dialog").open &&
      document.activeElement.matches('[data-action="show-details"]')
  );
}

const readDialog = () =>
  page.$eval("#product-dialog", (dialog) => {
    const field = (name) => dialog.querySelector(`[data-field="${name}"]`)?.textContent.trim();
    return {
      name: field("name"),
      price: field("price"),
      description: field("description"),
      caffeine: field("caffeinePer100ml"),
      nutrition: [...dialog.querySelectorAll('[data-field="nutrition"] tr')].map((row) =>
        [...row.children].map((cell) => cell.textContent.trim())
      ),
    };
  });

describe("Issue #3: Detailmodal", () => {
  it("das Modal ist beim Laden geschlossen", async () => {
    assert.equal(await isOpen(), false);
  });

  it("ein Klick auf ein Produkt öffnet das Detailmodal", async () => {
    await openDetails("original");
    assert.equal(await isOpen(), true);
    // Opened with showModal(): modal, so the rest of the page is inert.
    assert.equal(await page.$eval("#product-dialog", (dialog) => dialog.matches(":modal")), true);
    await closeWithEsc();
  });

  it("das Modal zeigt Name, Preis und Beschreibung des angeklickten Produkts", async () => {
    // PRODUCTS is the global constant declared in js/data.js.
    const products = await page.evaluate(() =>
      PRODUCTS.map(({ id, name, description, priceCents }) => ({ id, name, description, priceCents }))
    );
    // Every product, not just the first: a classic bug is a modal that
    // always shows product #1 or the previously opened one.
    for (const product of products) {
      await openDetails(product.id);
      const shown = await readDialog();
      assert.equal(shown.name, product.name);
      assert.equal(shown.description, product.description);
      assert.equal(shown.price, euro((product.priceCents / 100).toFixed(2).replace(".", ",")));
      await closeWithEsc();
    }
  });

  it("die Nährwerte pro Dose werden aus den Werten pro 100 ml berechnet", async () => {
    await openDetails("original");
    const { caffeine, nutrition } = await readDialog();
    // 160 mg per 150 ml can → 106,7 mg per 100 ml, shown rounded.
    assert.equal(caffeine, "107");
    assert.deepEqual(nutrition.find((row) => row[0] === "Koffein"), ["Koffein", "107 mg", "160 mg"]);
    assert.deepEqual(nutrition.find((row) => row[0] === "Brennwert"), [
      "Brennwert",
      "192 kJ / 46 kcal",
      "289 kJ / 69 kcal",
    ]);
    await closeWithEsc();
  });

  it("die Details-Buttons haben eindeutige Namen für Screenreader", async () => {
    const names = await page.$$eval('[data-action="show-details"]', (buttons) =>
      buttons.map((button) => button.textContent.replace(/\s+/g, " ").trim())
    );
    assert.equal(names[0], "Details zu DOPPIO Original");
    assert.equal(new Set(names).size, names.length);
  });

  it("das Modal ist per Tastatur erreichbar und nach dem Produkt benannt", async () => {
    await page.focus('[data-action="show-details"][data-product-id="zero"]');
    await page.keyboard.press("Enter");
    await page.waitForSelector("#product-dialog[open]");
    const label = await page.$eval("#product-dialog", (dialog) =>
      document.getElementById(dialog.getAttribute("aria-labelledby")).textContent.trim()
    );
    assert.equal(label, "DOPPIO Zero");
    await closeWithEsc();
  });

  it("der Inhalt des Modals lässt sich per Tastatur scrollen", async () => {
    // Small phone: the nutrition table does not fit, the body has to scroll.
    await page.setViewport({ width: 360, height: 640 });
    await page.focus('[data-action="show-details"][data-product-id="original"]');
    await page.keyboard.press("Enter");
    await page.waitForSelector("#product-dialog[open]");

    const body = "#product-dialog .dialog__body";
    const overflows = await page.$eval(body, (element) => element.scrollHeight > element.clientHeight);
    assert.ok(overflows, "Voraussetzung: der Inhalt ist höher als das Modal");

    // The scroll region must be reachable with Tab (since #4 the close
    // button comes first, before that the region itself got focus).
    const isBodyFocused = () => page.evaluate(() => document.activeElement.matches("#product-dialog .dialog__body"));
    for (let presses = 0; presses < 3 && !(await isBodyFocused()); presses++) {
      await page.keyboard.press("Tab");
    }
    assert.ok(await isBodyFocused(), "der scrollbare Bereich ist per Tab erreichbar");
    await page.keyboard.press("PageDown");
    await page.waitForFunction((selector) => document.querySelector(selector).scrollTop > 0, {}, body);

    await closeWithEsc();
    await page.setViewport({ width: 1280, height: 900 });
  });

  it("der scrollbare Bereich ist in jedem Browser fokussierbar und benannt", async () => {
    // Chrome focuses scroll containers on its own, which is why the test
    // above passes there even without tabindex. Safari does not, so the
    // region has to be focusable explicitly.
    const region = await page.$eval("#product-dialog .dialog__body", (element) => ({
      tag: element.tagName,
      tabIndex: element.getAttribute("tabindex"),
      label: element.getAttribute("aria-label"),
    }));
    assert.deepEqual(region, { tag: "SECTION", tabIndex: "0", label: "Produktdetails" });
  });

  it("öffnet und schließt ohne Fehler oder Warnungen in der Konsole", () => {
    assert.deepEqual(consoleProblems, []);
  });
});
