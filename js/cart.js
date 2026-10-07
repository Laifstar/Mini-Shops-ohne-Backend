/*
 * Cart state – deliberately free of any DOM code.
 *
 * Separating logic from presentation (app.js) keeps the rules (limits,
 * persistence) testable on their own, and a later API-backed cart only has
 * to keep this small interface.
 *
 * Persistence uses localStorage, so the cart survives a reload. It never
 * leaves the browser; there is no backend to send it to.
 */
"use strict";

const Cart = (() => {
  // Versioned key: if the stored format ever changes, old data is simply
  // ignored instead of breaking the page.
  const STORAGE_KEY = "doppio-cart-v1";
  // A plausible per-flavour limit for the demo (one tray of 24 cans).
  const MAX_QUANTITY = 24;

  const productsById = new Map(PRODUCTS.map((product) => [product.id, product]));
  const listeners = new Set();

  /** @type {Record<string, number>} product id -> quantity */
  let quantities = load();

  function clampQuantity(value) {
    return Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(Number(value)) || 0));
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      // Only keep what still makes sense: known products, sane quantities.
      // Protects against hand-edited storage and products that were removed
      // from data.js since the cart was saved.
      const result = {};
      for (const [id, quantity] of Object.entries(stored ?? {})) {
        const clamped = clampQuantity(quantity);
        if (productsById.has(id) && clamped > 0) result[id] = clamped;
      }
      return result;
    } catch {
      // Storage blocked (privacy settings) or corrupt JSON: start empty
      // instead of crashing the whole shop.
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      // Storage full or blocked: the cart still works until the next reload.
    }
  }

  function commit() {
    save();
    for (const listener of listeners) listener();
  }

  function getQuantity(productId) {
    return quantities[productId] ?? 0;
  }

  function setQuantity(productId, quantity) {
    if (!productsById.has(productId)) return;
    const clamped = clampQuantity(quantity);
    if (clamped === 0) {
      delete quantities[productId];
    } else {
      quantities[productId] = clamped;
    }
    commit();
  }

  /** Adds up to `quantity` cans and returns how many were actually added. */
  function add(productId, quantity = 1) {
    const before = getQuantity(productId);
    setQuantity(productId, before + quantity);
    return getQuantity(productId) - before;
  }

  function remove(productId) {
    setQuantity(productId, 0);
  }

  function clear() {
    quantities = {};
    commit();
  }

  /** Number of cans over all flavours, for the header. */
  function getItemCount() {
    return Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  }

  /** Everything the cart dialog needs in one object; all amounts in cents. */
  function getSummary() {
    const lines = Object.entries(quantities).map(([id, quantity]) => {
      const product = productsById.get(id);
      return { product, quantity, totalCents: product.priceCents * quantity };
    });
    const itemCount = getItemCount();
    const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
    const depositCents = itemCount * DEPOSIT_PER_CAN_CENTS;

    return { lines, itemCount, subtotalCents, depositCents, totalCents: subtotalCents + depositCents };
  }

  /** Calls `listener` after every change; returns an unsubscribe function. */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    MAX_QUANTITY,
    add,
    setQuantity,
    remove,
    clear,
    getQuantity,
    getItemCount,
    getSummary,
    subscribe,
  });
})();
