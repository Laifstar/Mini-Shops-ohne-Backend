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
];
