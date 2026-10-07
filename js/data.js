/*
 * Product catalogue of the DOPPIO demo shop.
 *
 * This file plays the role of the backend that the demo does not have.
 * The UI only reads PRODUCTS, so connecting a real API later means
 * replacing this file, not rewriting the rendering code.
 *
 * Conventions:
 * - Prices are integers in cents. Floating-point euros would produce
 *   rounding errors as soon as the cart adds them up (0.1 + 0.2 !== 0.3).
 * - Nutrition values are per 100 ml, as on a real label; per-can values
 *   are calculated in the UI so they can never contradict each other.
 * - Caffeine is stored per can because that is the selling point
 *   ("160 mg like a 500 ml can"); the legally required mg/100 ml is derived.
 * - All products, prices and ingredients are fictional.
 */
"use strict";

/** German single-use deposit ("Einwegpfand") per can, in cents. */
const DEPOSIT_PER_CAN_CENTS = 25;

const PRODUCTS = Object.freeze([
  {
    id: "original",
    name: "DOPPIO Original",
    flavour: "Classic Energy",
    description:
      "Der Klassiker im Espresso-Format: fruchtig-herb, mit kräftiger Kohlensäure. " +
      "Ein Shot, 160 mg Koffein, eiskalt am besten.",
    priceCents: 199,
    volumeMl: 150,
    caffeineMgPerCan: 160,
    sugarFree: false,
    badge: "Bestseller",
    colors: { body: "#f0a500", band: "#24150e", logo: "#24150e" },
    nutritionPer100ml: { energyKcal: 46, fat: 0, carbs: 11.2, sugar: 11, protein: 0, salt: 0.12, taurineMg: 600 },
    ingredients:
      "Wasser, Zucker, Säuerungsmittel Citronensäure, Kohlensäure, Taurin (0,6 %), " +
      "Säureregulator Natriumcitrate, Koffein (0,11 %), Aroma, Farbstoff Zuckerkulör, " +
      "Vitamine (Niacin, Pantothensäure, B6, B12).",
  },
  {
    id: "zero",
    name: "DOPPIO Zero",
    flavour: "Classic Energy, zuckerfrei",
    description:
      "Der Original-Geschmack ohne Zucker und mit nur 5 kcal pro Dose. " +
      "Für alle, die das Koffein wollen, aber nicht die Kalorien.",
    priceCents: 199,
    volumeMl: 150,
    caffeineMgPerCan: 160,
    sugarFree: true,
    badge: null,
    colors: { body: "#e7e2da", band: "#24150e", logo: "#24150e" },
    nutritionPer100ml: { energyKcal: 3, fat: 0, carbs: 0.4, sugar: 0, protein: 0, salt: 0.15, taurineMg: 600 },
    ingredients:
      "Wasser, Säuerungsmittel Citronensäure, Kohlensäure, Taurin (0,6 %), " +
      "Säureregulator Natriumcitrate, Koffein (0,11 %), Süßungsmittel (Sucralose, Acesulfam K), " +
      "Aroma, Vitamine (Niacin, Pantothensäure, B6, B12). Mit Süßungsmitteln.",
  },
  {
    id: "mango-chili",
    name: "DOPPIO Mango-Chili",
    flavour: "Mango mit Chili-Schärfe",
    description:
      "Reife Mango trifft auf eine leichte Chili-Schärfe im Abgang. " +
      "Weckt die Geschmacksnerven gleich mit.",
    priceCents: 229,
    volumeMl: 150,
    caffeineMgPerCan: 160,
    sugarFree: false,
    badge: "Neu",
    colors: { body: "#ff8a1f", band: "#b91c1c", logo: "#24150e" },
    nutritionPer100ml: { energyKcal: 49, fat: 0, carbs: 12, sugar: 11.6, protein: 0, salt: 0.08, taurineMg: 600 },
    ingredients:
      "Wasser, Zucker, Mangosaft aus Mangomark (5 %), Säuerungsmittel Citronensäure, " +
      "Kohlensäure, Taurin (0,6 %), Koffein (0,11 %), natürliches Aroma, Chiliextrakt, " +
      "Farbstoff Carotin, Vitamine (Niacin, B6, B12).",
  },
  {
    id: "schwarzkirsche",
    name: "DOPPIO Schwarzkirsche",
    flavour: "Dunkle Kirsche",
    description:
      "Dunkle Kirsche, wenig Säure, voller Körper. " +
      "Schmeckt wie ein Kirsch-Espresso mit Kohlensäure.",
    priceCents: 229,
    volumeMl: 150,
    caffeineMgPerCan: 160,
    sugarFree: false,
    badge: null,
    colors: { body: "#6d0f2a", band: "#f4e7d4", logo: "#f4e7d4" },
    nutritionPer100ml: { energyKcal: 48, fat: 0, carbs: 11.8, sugar: 11.4, protein: 0, salt: 0.1, taurineMg: 600 },
    ingredients:
      "Wasser, Zucker, Kirschsaft aus Kirschsaftkonzentrat (4 %), Säuerungsmittel Citronensäure, " +
      "Kohlensäure, Taurin (0,6 %), Koffein (0,11 %), natürliches Aroma, " +
      "färbendes Lebensmittel Karottenkonzentrat, Vitamine (Niacin, B6, B12).",
  },
  {
    id: "citrus-minze",
    name: "DOPPIO Citrus-Minze",
    flavour: "Limette und Minze, zuckerfrei",
    description:
      "Limette und frische Minze, ohne Zucker. " +
      "Kühl, klar und genau richtig für heiße Tage.",
    priceCents: 229,
    volumeMl: 150,
    caffeineMgPerCan: 160,
    sugarFree: true,
    badge: null,
    colors: { body: "#2f8f6b", band: "#e3f56b", logo: "#fbf8f4" },
    nutritionPer100ml: { energyKcal: 3, fat: 0, carbs: 0.5, sugar: 0.2, protein: 0, salt: 0.1, taurineMg: 600 },
    ingredients:
      "Wasser, Säuerungsmittel Citronensäure, Kohlensäure, Limettensaft aus Limettensaftkonzentrat (2 %), " +
      "Taurin (0,6 %), Koffein (0,11 %), Süßungsmittel (Steviolglycoside, Sucralose), " +
      "natürliches Minzaroma, Vitamine (Niacin, B6, B12). Mit Süßungsmitteln.",
  },
  {
    id: "crema",
    name: "DOPPIO Crema",
    flavour: "Espresso und Vanille",
    description:
      "Die Hommage an den Namensgeber: echter Kaffeeextrakt mit einem Hauch Vanille. " +
      "Limitierte Edition.",
    priceCents: 249,
    volumeMl: 150,
    caffeineMgPerCan: 160,
    sugarFree: false,
    badge: "Limitiert",
    colors: { body: "#3a2418", band: "#f4e7d4", logo: "#f4e7d4" },
    nutritionPer100ml: { energyKcal: 45, fat: 0, carbs: 10.9, sugar: 10.5, protein: 0.1, salt: 0.09, taurineMg: 600 },
    ingredients:
      "Wasser, Zucker, Kaffeeextrakt (1,5 %), Kohlensäure, Taurin (0,6 %), " +
      "Säuerungsmittel Citronensäure, Koffein (0,11 %), natürliches Vanillearoma, " +
      "Farbstoff Zuckerkulör, Vitamine (Niacin, B6, B12).",
  },
]);
