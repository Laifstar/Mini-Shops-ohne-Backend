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

function formatNumber(value, maximumFractionDigits = 1) {
  return value.toLocaleString("de-DE", { maximumFractionDigits });
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

  // Six buttons all called "Details" are ambiguous in a screen reader's
  // list of controls; the hidden suffix makes each name unique.
  field("detailsLabel").textContent = ` zu ${product.name}`;
  card.querySelector('[data-action="show-details"]').dataset.productId = product.id;

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

// ---------- Dialogs: opening and closing (issue #4) ----------

// Remembers which button opened a dialog, so focus can go back there when it
// closes. Current browsers do this on their own, older ones drop focus to
// <body>, which sends keyboard users back to the top of the page.
const returnFocusTo = new WeakMap();

function openDialog(dialog, trigger) {
  returnFocusTo.set(dialog, trigger);
  dialog.showModal();
}

function setupDialog(dialog) {
  // Only close on the backdrop if the click also *started* there. Otherwise
  // selecting text inside the dialog and releasing the mouse outside it
  // would close the dialog unexpectedly.
  let pressedOnBackdrop = false;

  dialog.addEventListener("pointerdown", (event) => {
    pressedOnBackdrop = event.target === dialog;
  });

  dialog.addEventListener("click", (event) => {
    // The dialog box has no padding and is completely covered by header and
    // body, so a click whose target is the <dialog> itself hit the backdrop.
    const isBackdropClick = event.target === dialog && pressedOnBackdrop;
    if (isBackdropClick || event.target.closest('[data-action="close-dialog"]')) {
      dialog.close();
    }
  });

  // "close" fires for every way of closing: button, backdrop, Esc.
  dialog.addEventListener("close", () => {
    const trigger = returnFocusTo.get(dialog);
    if (trigger?.isConnected) trigger.focus();
  });
}

// ---------- Product detail modal (issue #3) ----------

const productDialog = document.querySelector("#product-dialog");
const KJ_PER_KCAL = 4.184;

// Rows of the nutrition table. Each row knows how to format itself for a
// given factor (1 = per 100 ml, 1.5 = per 150 ml can), so both columns are
// always calculated from the same per-100-ml source values.
const amount = (key, unit, digits = 1) => (values, factor) =>
  `${formatNumber(values[key] * factor, digits)} ${unit}`;

const NUTRITION_ROWS = [
  {
    label: "Brennwert",
    format: (values, factor) =>
      `${formatNumber(values.energyKcal * factor * KJ_PER_KCAL, 0)} kJ / ` +
      `${formatNumber(values.energyKcal * factor, 0)} kcal`,
  },
  { label: "Fett", format: amount("fat", "g") },
  { label: "Kohlenhydrate", format: amount("carbs", "g") },
  { label: "davon Zucker", format: amount("sugar", "g"), isSubRow: true },
  { label: "Eiweiß", format: amount("protein", "g") },
  { label: "Salz", format: amount("salt", "g", 2) },
  { label: "Koffein", format: amount("caffeineMg", "mg", 0) },
  { label: "Taurin", format: amount("taurineMg", "mg", 0) },
];

function getCaffeinePer100ml(product) {
  return (product.caffeineMgPerCan / product.volumeMl) * 100;
}

function createNutritionRows(product) {
  const values = { ...product.nutritionPer100ml, caffeineMg: getCaffeinePer100ml(product) };
  const canFactor = product.volumeMl / 100;

  return NUTRITION_ROWS.map((row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = row.label;
    if (row.isSubRow) th.classList.add("nutrition__sub-row");

    const per100ml = document.createElement("td");
    per100ml.textContent = row.format(values, 1);
    const perCan = document.createElement("td");
    perCan.textContent = row.format(values, canFactor);

    tr.append(th, per100ml, perCan);
    return tr;
  });
}

function fillProductDialog(product) {
  const field = (name) => productDialog.querySelector(`[data-field="${name}"]`);

  field("name").textContent = product.name;
  field("media").style.setProperty("--tint", product.colors.body);
  field("media").replaceChildren(createCan(product.colors));
  field("flavour").textContent = product.flavour;
  field("description").textContent = product.description;
  field("price").textContent = formatPrice(product.priceCents);
  field("deposit").textContent = formatPrice(DEPOSIT_PER_CAN_CENTS);
  field("unitPrice").textContent = formatUnitPrice(product);
  field("caffeinePer100ml").textContent = formatNumber(getCaffeinePer100ml(product), 0);
  field("volume").textContent = `${product.volumeMl} ml`;
  field("nutrition").replaceChildren(...createNutritionRows(product));
  field("ingredients").textContent = product.ingredients;
}

function openProductDialog(product, trigger) {
  fillProductDialog(product);
  openDialog(productDialog, trigger);
  // The dialog body keeps its scroll position between openings; start every
  // product at the top.
  productDialog.querySelector(".dialog__body").scrollTop = 0;
}

// One delegated listener on the grid instead of one per card: fewer
// listeners, and it keeps working if the list is ever re-rendered.
productGrid.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="show-details"]');
  if (!button) return;

  // Looked up by id, not by position: the modal must show the product that
  // was actually clicked, even if the list order ever changes.
  const product = PRODUCTS.find((item) => item.id === button.dataset.productId);
  if (product) openProductDialog(product, button);
});

// ---------- Start ----------

setupDialog(productDialog);
renderDepositNote();
renderProductList();
