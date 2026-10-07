/*
 * Accessibility QA of issue #12 ("Fortgeschritten" level of the worksheet).
 *
 * axe-core and Lighthouse already run after every issue (npm run
 * qa:evidence). These tests cover what they cannot decide on their own:
 * a complete purchase by keyboard with a visible focus at every step, names
 * in the accessibility tree, reflow at 320 px and with increased text
 * spacing, contrast on gradients and of focus rings, and Windows contrast
 * themes (forced colors). Findings and fixes: docs/barrierefreiheit.md.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

async function prepareCart(quantities) {
  await page.evaluate((value) => localStorage.setItem("doppio-cart-v1", JSON.stringify(value)), quantities);
  await page.reload();
}

const settle = () => page.waitForFunction(() => document.getAnimations().length === 0);

// ---------- Focus visibility ----------

/**
 * Describes the focused element and whether its focus ring can be seen:
 * an outline must exist, and it must not be cut off on three or more sides
 * by an ancestor with overflow (a ring inside a clipping box is invisible
 * even though the CSS says it is there).
 */
const focusState = () =>
  page.evaluate(() => {
    const element = document.activeElement;
    const style = getComputedStyle(element);
    const label = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""} "${(
      element.getAttribute("aria-label") ?? element.textContent
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40)}"`;
    const hasRing = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
    const box = element.getBoundingClientRect();
    const grow = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
    const ring = { left: box.left - grow, right: box.right + grow, top: box.top - grow, bottom: box.bottom + grow };
    let clippedBy = null;
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (ancestorStyle.overflowX === "visible" && ancestorStyle.overflowY === "visible") continue;
      const clip = ancestor.getBoundingClientRect();
      const clippedSides = [
        ring.left < clip.left - 0.5,
        ring.right > clip.right + 0.5,
        ring.top < clip.top - 0.5,
        ring.bottom > clip.bottom + 0.5,
      ].filter(Boolean).length;
      if (clippedSides >= 3) clippedBy = ancestor.className || ancestor.tagName;
    }
    return { element: label, hasRing, clippedBy, id: element.id, action: element.dataset.action };
  });

async function assertFocusVisible() {
  const state = await focusState();
  assert.ok(state.hasRing, `kein Fokusrahmen an ${state.element}`);
  assert.equal(state.clippedBy, null, `Fokusrahmen von ${state.element} wird von .${state.clippedBy} abgeschnitten`);
  return state;
}

async function press(key, { shift = false } = {}) {
  if (shift) await page.keyboard.down("Shift");
  await page.keyboard.press(key);
  if (shift) await page.keyboard.up("Shift");
}

/** Tabs (forward or back) until `isTarget(focusState)` holds; checks the ring at every stop. */
async function tabUntil(isTarget, { shift = false, max = 60 } = {}) {
  for (let presses = 0; presses < max; presses++) {
    await press("Tab", { shift });
    const state = await assertFocusVisible();
    if (isTarget(state)) return state;
  }
  throw new Error("Ziel per Tab nicht erreicht");
}

// ---------- Contrast ----------

function luminance(hex) {
  const channels = hex.match(/\w\w/g).map((value) => parseInt(value, 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

// Colours are read from the stylesheet, so the test follows any change there.
const css = readFileSync(new URL("../css/styles.css", import.meta.url), "utf8");
const token = (name) => {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css);
  assert.ok(match, `Token --${name} nicht gefunden`);
  return match[1];
};

describe("Issue #12: Barrierefreiheit", () => {
  it("ein kompletter Einkauf gelingt nur mit der Tastatur, der Fokus ist immer sichtbar", async () => {
    // Skip link first.
    let state = await tabUntil(() => true);
    assert.match(state.element, /Zum Inhalt springen/);

    // Open the details of DOPPIO Zero.
    await tabUntil((s) => s.element.includes("Details zu DOPPIO Zero"));
    await press("Enter");
    await page.waitForSelector("#product-dialog[open]");
    await settle();
    await assertFocusVisible();

    // Through the modal to the quantity field: 2 cans, Enter submits.
    await tabUntil((s) => s.id === "quantity-input");
    await press("ArrowUp");
    await press("Enter");
    await page.waitForFunction(() => !document.querySelector("#product-dialog").open);
    assert.equal(await page.$eval("[data-cart-count]", (element) => element.textContent), "2");
    state = await assertFocusVisible();
    assert.match(state.element, /Details zu DOPPIO Zero/, "Fokus zurück am Auslöser");

    // Back up to the cart button and open the cart.
    await tabUntil((s) => s.id === "cart-button", { shift: true });
    await press("Enter");
    await page.waitForSelector("#cart-dialog[open]");
    await settle();

    // One more can, then empty the cart.
    await tabUntil((s) => s.action === "increase");
    await press("Enter");
    assert.equal(await page.$eval("[data-cart-count]", (element) => element.textContent), "3");
    await assertFocusVisible();
    await tabUntil((s) => s.action === "clear-cart");
    await press("Enter");
    state = await assertFocusVisible();
    assert.equal(state.id, "cart-dialog-title", "Fokus bleibt im Dialog");

    await press("Escape");
    await page.waitForFunction(() => !document.querySelector("#cart-dialog").open);
    state = await assertFocusVisible();
    assert.equal(state.id, "cart-button");
  });

  it("der scrollbare Inhalt des Detailmodals zeigt einen sichtbaren Fokusrahmen", async () => {
    await page.click('[data-action="show-details"][data-product-id="original"]');
    await page.waitForSelector("#product-dialog[open]");
    await settle();
    // Reached by keyboard, so :focus-visible applies.
    await tabUntil((s) => s.element.startsWith("section"));
  });

  it("alle Bedienelemente haben im Accessibility-Tree Rolle und eindeutigen Namen", async () => {
    await prepareCart({ original: 2, crema: 1, zero: 1 });
    const collect = (node, found = []) => {
      if (["button", "link", "spinbutton", "textbox", "dialog"].includes(node.role)) found.push(node);
      for (const child of node.children ?? []) collect(child, found);
      return found;
    };

    // Page, detail modal and filled cart: three different sets of controls.
    const snapshots = { Seite: await page.accessibility.snapshot() };
    await page.click('[data-action="show-details"][data-product-id="original"]');
    await page.waitForSelector("#product-dialog[open]");
    snapshots.Detailmodal = await page.accessibility.snapshot();
    await press("Escape");
    await page.click("#cart-button");
    await page.waitForSelector("#cart-dialog[open]");
    snapshots.Warenkorb = await page.accessibility.snapshot();

    for (const [where, snapshot] of Object.entries(snapshots)) {
      const controls = collect(snapshot);
      assert.ok(controls.length > 0, `${where}: keine Bedienelemente gefunden`);
      for (const control of controls) {
        assert.ok(control.name?.trim(), `${where}: ${control.role} ohne Namen`);
      }
      // Screen reader users jump through a list of all buttons: identical
      // names ("Details", "Eine Dose mehr") are useless there.
      const buttonNames = controls.filter((control) => control.role === "button").map((control) => control.name);
      const duplicates = buttonNames.filter((name, index) => buttonNames.indexOf(name) !== index);
      assert.deepEqual([...new Set(duplicates)], [], `${where}: mehrdeutige Buttons`);
    }

    const cartControls = collect(snapshots.Warenkorb);
    assert.ok(cartControls.some((control) => control.role === "dialog" && control.name === "Warenkorb"));
    const productControls = collect(snapshots.Detailmodal);
    assert.ok(productControls.some((control) => control.role === "spinbutton" && control.name === "Menge"));
  });

  /** Visible elements that stick out of the viewport or of a clipping ancestor horizontally. */
  const horizontalClipping = () =>
    page.evaluate(() => {
      const problems = [];
      for (const element of document.querySelectorAll("body *")) {
        if (!element.checkVisibility() || element.closest(".visually-hidden, template, svg text")) continue;
        const box = element.getBoundingClientRect();
        if (box.width === 0) continue;
        let clip = { left: 0, right: document.documentElement.clientWidth };
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (getComputedStyle(ancestor).overflowX !== "visible") {
            const rect = ancestor.getBoundingClientRect();
            clip = { left: Math.max(clip.left, rect.left), right: Math.min(clip.right, rect.right) };
          }
        }
        if (box.left < clip.left - 1 || box.right > clip.right + 1) {
          problems.push(`${element.tagName.toLowerCase()}.${element.className} (${Math.round(box.left)}–${Math.round(box.right)})`);
        }
      }
      return problems;
    });

  async function checkReflow(where) {
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(pageOverflow, 0, `${where}: Seite scrollt waagerecht`);
    assert.deepEqual(await horizontalClipping(), [], `${where}: abgeschnittene Inhalte`);
  }

  it("bei 320 px (200 % Zoom) geht kein Inhalt verloren", async () => {
    await page.setViewport({ width: 320, height: 568 });
    await prepareCart({ "mango-chili": 2, "citrus-minze": 24, schwarzkirsche: 1 });
    await checkReflow("Startseite");
    await page.click('[data-action="show-details"][data-product-id="schwarzkirsche"]');
    await page.waitForSelector("#product-dialog[open]");
    await settle();
    await checkReflow("Detailmodal");
    await press("Escape");
    await page.click("#cart-button");
    await page.waitForSelector("#cart-dialog[open]");
    await settle();
    await checkReflow("Warenkorb");
  });

  it("mit vergrößerten Text- und Zeilenabständen (WCAG 1.4.12) bleibt alles lesbar", async () => {
    // The values WCAG 1.4.12 requires content to survive.
    await page.addStyleTag({
      content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
                p { margin-bottom: 2em !important; }`,
    });
    for (const width of [390, 1280]) {
      await page.setViewport({ width, height: 800 });
      await checkReflow(`${width} px`);
    }
  });

  it("alle Text- und Bedienelement-Farben erreichen den nötigen Kontrast", () => {
    // [foreground, background, minimum, where]; 4.5:1 for text, 3:1 for UI.
    const pairs = [
      [token("color-ink"), token("color-paper"), 4.5, "Fließtext"],
      [token("color-muted"), token("color-paper"), 4.5, "Nebentext auf Papier"],
      [token("color-muted"), token("color-surface"), 4.5, "Nebentext auf Karte/Dialog"],
      [token("color-ink"), token("color-gold"), 4.5, "Primär-Button, Badge"],
      [token("color-ink"), token("color-gold-hover"), 4.5, "Primär-Button Hover"],
      [token("color-espresso"), token("color-surface"), 4.5, "Details-Button"],
      [token("color-crema"), token("color-espresso"), 4.5, "Header, Toast"],
      // Hero gradient: checked against its lighter stop, the worst case
      // (axe reports these as "needs review").
      [token("color-crema"), token("color-espresso-soft"), 4.5, "Hero-Überschrift"],
      [token("color-on-dark"), token("color-espresso-soft"), 4.5, "Hero-Text"],
      [token("color-on-dark-muted"), token("color-espresso-soft"), 4.5, "Hero-Fußnote"],
      [token("color-gold"), token("color-espresso-soft"), 4.5, "Hero-Eyebrow"],
      ["#14532d", "#dcfce7", 4.5, "Merkmal „zuckerfrei“"],
      [token("color-ink"), "#fff4dc", 4.5, "Koffein-Hinweis"],
      [token("color-ink"), token("color-crema"), 4.5, "Statusmeldung im Warenkorb"],
      [token("focus-ring"), token("color-paper"), 3, "Fokusrahmen auf Papier"],
      [token("focus-ring"), token("color-surface"), 3, "Fokusrahmen auf Karte/Dialog"],
      ["#ffd166", token("color-espresso"), 3, "Fokusrahmen im Header"],
      ["#ffd166", token("color-espresso-soft"), 3, "Fokusrahmen im Hero"],
      [token("color-muted"), token("color-surface"), 3, "Rahmen des Mengenfelds"],
    ];
    const failing = pairs
      .map(([foreground, background, minimum, where]) => ({ where, ratio: contrast(foreground, background), minimum }))
      .filter(({ ratio, minimum }) => ratio < minimum)
      .map(({ where, ratio, minimum }) => `${where}: ${ratio.toFixed(2)} : 1 < ${minimum} : 1`);
    assert.deepEqual(failing, []);
  });

  it("im Windows-Kontrastmodus bleiben gesperrte Buttons als gesperrt erkennbar", async () => {
    await prepareCart({ original: 1 });
    // Puppeteer's emulateMediaFeatures() rejects "forced-colors", the
    // DevTools protocol underneath supports it.
    const session = await page.createCDPSession();
    await session.send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    assert.ok(await page.evaluate(() => matchMedia("(forced-colors: active)").matches));
    await page.click("#cart-button");
    await page.waitForSelector("#cart-dialog[open]");
    const colors = await page.$eval('#cart-dialog .cart-line[data-product-id="original"]', (line) => ({
      locked: getComputedStyle(line.querySelector('[data-action="decrease"]')).color,
      active: getComputedStyle(line.querySelector('[data-action="increase"]')).color,
    }));
    // Forced colors replace author colours; without a system colour for the
    // locked state both buttons look the same.
    assert.notEqual(colors.locked, colors.active);
  });
});
