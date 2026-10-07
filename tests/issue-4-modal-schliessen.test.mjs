/*
 * Acceptance criteria of issue #4 "Modal schließen und Oberfläche verbessern".
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

const isOpen = () => page.$eval("#product-dialog", (dialog) => dialog.open);
const isVisible = () => page.$eval("#product-dialog", (dialog) => dialog.checkVisibility());

async function openDetails(productId = "original") {
  await page.click(`[data-action="show-details"][data-product-id="${productId}"]`);
  await page.waitForSelector("#product-dialog[open]");
  // Measure only after the fade-in: during it the dialog is scaled to 98 %,
  // which makes a 44 px button measure 43 px.
  await page.waitForFunction(() => document.getAnimations().length === 0);
}

// Closed and focus back on the button that opened the modal. Waiting for
// both avoids a race with the "close" event that restores focus.
async function waitUntilClosedOn(productId) {
  await page.waitForFunction(
    (id) =>
      !document.querySelector("#product-dialog").open &&
      document.activeElement.matches(`[data-action="show-details"][data-product-id="${id}"]`),
    {},
    productId
  );
}

describe("Issue #4: Modal schließen und Oberfläche", () => {
  it("das Modal ist nicht dauerhaft sichtbar", async () => {
    assert.equal(await isOpen(), false, "beim Laden geschlossen");
    assert.equal(await isVisible(), false, "beim Laden unsichtbar");
  });

  it("der Schließen-Button schließt das Modal und gibt den Fokus zurück", async () => {
    await openDetails("zero");
    const button = await page.$eval("#product-dialog .dialog__close", (element) => ({
      name: element.textContent.trim(),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }));
    assert.equal(button.name, "Schließen", "verständlicher Name für Screenreader");
    assert.ok(button.width >= 44 && button.height >= 44, "Touch-Ziel mindestens 44 × 44 px");

    await page.click("#product-dialog .dialog__close");
    await waitUntilClosedOn("zero");
    assert.equal(await isVisible(), false, "nach dem Schließen wieder unsichtbar");
  });

  it("ein Klick außerhalb des Modals schließt es", async () => {
    await openDetails("crema");
    // Top left corner: backdrop on every screen size, the dialog is centred.
    await page.mouse.click(4, 4);
    await waitUntilClosedOn("crema");
  });

  it("ein Klick im Modal oder ein Ziehen nach außen schließt es nicht", async () => {
    await openDetails("original");
    await page.click("#product-dialog .dialog__body h3");
    assert.equal(await isOpen(), true, "Klick auf den Inhalt");

    // Selecting text and releasing the mouse on the backdrop must not close.
    const box = await (await page.$("#product-dialog [data-field='description']")).boundingBox();
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(4, 4, { steps: 5 });
    await page.mouse.up();
    assert.equal(await isOpen(), true, "Ziehen aus dem Modal heraus");

    await page.keyboard.press("Escape");
    await waitUntilClosedOn("original");
  });

  it("die Seite dahinter scrollt nicht mit und springt nicht zur Seite", async () => {
    const before = await page.evaluate(() => document.documentElement.clientWidth);
    await openDetails("zero");
    const during = await page.evaluate(() => ({
      overflow: getComputedStyle(document.documentElement).overflow,
      width: document.documentElement.clientWidth,
    }));
    assert.equal(during.overflow, "hidden", "Seite gesperrt, solange das Modal offen ist");
    assert.equal(during.width, before, "keine seitliche Verschiebung beim Öffnen");
    await page.click("#product-dialog .dialog__close");
    await waitUntilClosedOn("zero");
  });

  for (const viewport of [
    { width: 320, height: 568, label: "kleines Smartphone" },
    { width: 390, height: 844, label: "Smartphone" },
    { width: 1280, height: 800, label: "Desktop" },
  ]) {
    it(`ist auf dem ${viewport.label} (${viewport.width} px) nutzbar`, async () => {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert.equal(pageOverflow, 0, "kein horizontales Scrollen");

      await openDetails("mango-chili");
      const layout = await page.evaluate(() => {
        const dialog = document.querySelector("#product-dialog").getBoundingClientRect();
        const close = document.querySelector("#product-dialog .dialog__close").getBoundingClientRect();
        return {
          fits: dialog.left >= 0 && dialog.right <= innerWidth && dialog.top >= 0 && dialog.bottom <= innerHeight,
          closeVisible: close.top >= 0 && close.right <= innerWidth,
        };
      });
      assert.ok(layout.fits, "Modal passt in den Bildschirm");
      assert.ok(layout.closeVisible, "Schließen-Button sichtbar");

      await page.click("#product-dialog .dialog__close");
      await waitUntilClosedOn("mango-chili");
    });
  }

  it("alle Buttons haben verständliche Beschriftungen", async () => {
    const names = await page.$$eval("button", (buttons) =>
      buttons.map((button) => (button.getAttribute("aria-label") ?? button.textContent).replace(/\s+/g, " ").trim())
    );
    for (const name of names) {
      assert.ok(name.length > 1, `Button ohne verständlichen Namen: "${name}"`);
      assert.doesNotMatch(name, /^[×x✕]$/i, "nur ein Symbol ist kein Name");
    }
  });

  it("die Einblend-Animation respektiert „Bewegung reduzieren“", async () => {
    const animationWhenOpen = async (reduce) => {
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduce }]);
      await openDetails("zero");
      const name = await page.$eval("#product-dialog", (dialog) => getComputedStyle(dialog).animationName);
      await page.click("#product-dialog .dialog__close");
      await waitUntilClosedOn("zero");
      return name;
    };
    assert.equal(await animationWhenOpen("no-preference"), "dialog-in");
    assert.equal(await animationWhenOpen("reduce"), "none");
  });

  it("öffnet und schließt ohne Fehler oder Warnungen in der Konsole", () => {
    assert.deepEqual(consoleProblems, []);
  });
});
