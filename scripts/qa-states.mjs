/*
 * Interaction states that the evidence run captures in addition to the
 * freshly loaded page (e.g. "detail modal open").
 *
 * Lighthouse only ever sees the page right after loading, so everything that
 * appears on interaction would go unchecked. Each issue that adds such a
 * state appends it here; later runs then keep checking everything built so
 * far, which turns the list into a small regression suite.
 *
 * Shape: { id: "file-name-safe", label: "Deutsche Beschriftung", enter: async (page) => {} }
 * Add `fullPage: true` only for states without fixed or sticky overlays.
 */
export const states = [
  {
    // Issue #3: the modal is the first thing Lighthouse never sees.
    id: "detailmodal",
    label: "Detailmodal geöffnet",
    enter: async (page) => {
      await page.click('[data-action="show-details"]');
      await page.waitForSelector("#product-dialog[open]");
    },
  },
  {
    // Issue #10: confirmation toast and the updated count in the header.
    id: "warenkorb-bestaetigung",
    label: "Nach „In den Warenkorb“",
    enter: async (page) => {
      await page.click('[data-action="show-details"]');
      await page.waitForSelector("#product-dialog[open]");
      await page.click('#add-to-cart-form button[type="submit"]');
      await page.waitForSelector("#toast.is-visible");
    },
  },
  {
    // Issue #11: the cart dialog, once empty and once with three flavours.
    id: "warenkorb-leer",
    label: "Warenkorb leer",
    enter: async (page) => {
      await page.click("#cart-button");
      await page.waitForSelector("#cart-dialog[open]");
    },
  },
  {
    id: "warenkorb-gefuellt",
    label: "Warenkorb gefüllt",
    enter: async (page) => {
      // Filled via storage (format of js/cart.js) instead of three trips
      // through the modal; each state runs in its own empty browser context.
      await page.evaluate(() =>
        localStorage.setItem("doppio-cart-v1", JSON.stringify({ original: 3, "mango-chili": 2, crema: 1 }))
      );
      await page.reload({ waitUntil: "networkidle0" });
      await page.click("#cart-button");
      await page.waitForSelector("#cart-dialog[open]");
    },
  },
];
