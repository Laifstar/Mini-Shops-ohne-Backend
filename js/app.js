/*
 * DOPPIO mini-shop – UI logic (rendering and event handling).
 *
 * Loaded as a classic deferred script instead of an ES module on purpose:
 * browsers block module imports from file:// URLs, and the customer demo
 * has to work by double-clicking index.html, without server or build step.
 * The trade-off is a shared global scope, which is why data.js exposes only
 * PRODUCTS and DEPOSIT_PER_CAN_CENTS.
 *
 * All content is inserted via textContent and cloned <template>s, never
 * via innerHTML. Today the data is static, but once it comes from an API
 * that rule is what keeps the shop safe from injected markup (XSS).
 */
"use strict";

// ---------- Formatting ----------

// Created once and reused: Intl formatters are comparatively expensive.
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

function formatPrice(cents) {
  return euro.format(cents / 100);
}

// German price law (PAngV) requires the price per litre next to the price.
// Non-breaking spaces keep "16,60 € / 1 l" from wrapping in the middle.
function formatUnitPrice(product) {
  const centsPerLitre = Math.round((product.priceCents * 1000) / product.volumeMl);
  return `${formatPrice(centsPerLitre)} / 1 l`;
}

// ---------- Shared building blocks ----------

const canTemplate = document.querySelector("#can-template");

/**
 * Returns a fresh can illustration in the product's colours.
 * The colours are handed over as CSS custom properties, so the SVG markup
 * itself stays static and lives in exactly one place (index.html).
 */
function createCan(colors) {
  const can = canTemplate.content.firstElementChild.cloneNode(true);
  can.style.setProperty("--can-body", colors.body);
  can.style.setProperty("--can-band", colors.band);
  can.style.setProperty("--can-logo", colors.logo);
  return can;
}

function getTags(product) {
  const tags = [];
  if (product.badge) tags.push({ label: product.badge, variant: "badge" });
  if (product.sugarFree) tags.push({ label: "zuckerfrei", variant: "sugar-free" });
  return tags;
}

function createTagList(product) {
  const list = document.createElement("ul");
  list.className = "tags";
  list.setAttribute("aria-label", "Merkmale");
  for (const tag of getTags(product)) {
    const item = document.createElement("li");
    item.className = `tag tag--${tag.variant}`;
    item.textContent = tag.label;
    list.append(item);
  }
  return list;
}

// ---------- Product list (issue #2) ----------

const productGrid = document.querySelector("#product-grid");
const cardTemplate = document.querySelector("#product-card-template");

function createProductCard(product) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const field = (name) => card.querySelector(`[data-field="${name}"]`);

  // The tinted background picks up the can colour so every card feels
  // like its flavour without needing extra data.
  field("media").style.setProperty("--tint", product.colors.body);
  field("media").append(createCan(product.colors));
  field("name").textContent = product.name;
  field("flavour").textContent = product.flavour;
  field("price").textContent = formatPrice(product.priceCents);
  field("unitPrice").textContent = formatUnitPrice(product);

  const tags = createTagList(product);
  if (tags.children.length > 0) field("flavour").after(tags);

  return card;
}

function renderProductList() {
  // Build all cards in a fragment first, so the grid is laid out only once.
  const fragment = document.createDocumentFragment();
  for (const product of PRODUCTS) {
    fragment.append(createProductCard(product));
  }
  productGrid.replaceChildren(fragment);
}

// The deposit is stated in the section intro as well; filling it from the
// same constant as the prices keeps both from drifting apart.
function renderDepositNote() {
  for (const element of document.querySelectorAll("[data-deposit]")) {
    element.textContent = formatPrice(DEPOSIT_PER_CAN_CENTS);
  }
}

// ---------- Start ----------

renderDepositNote();
renderProductList();
