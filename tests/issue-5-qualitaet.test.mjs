/*
 * Code consistency checks from the test round of issue #5. No browser
 * needed: they read the source files.
 *
 * Background: PR #8 carried an unused CSS rule into main (copied by line
 * range from the archived shop), and the review did not notice. Nothing a
 * visitor sees, but dead code misleads the next person reading the file,
 * so this kind of mistake is now caught automatically.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");

const css = stripComments(read("css/styles.css"));
const html = read("index.html");
const scripts = ["js/data.js", "js/cart.js", "js/app.js"].map(read).join("\n");

// Classes that app.js assembles from data at runtime, so the full name
// never appears as text: "tag tag--${tag.variant}" with these variants.
const ASSEMBLED_CLASSES = {
  "tag--badge": 'variant: "badge"',
  "tag--sugar-free": 'variant: "sugar-free"',
};

describe("Issue #5: Code-Konsistenz", () => {
  it("jede Klasse im Stylesheet wird in HTML oder JavaScript verwendet", () => {
    // Class selectors only: ".name" outside declarations ({ … }) and comments.
    const selectors = css.replace(/\{[^}]*\}/g, "{}");
    const classes = new Set([...selectors.matchAll(/\.([a-z][\w-]*)/gi)].map((match) => match[1]));
    assert.ok(classes.size > 50, "Plausibilität: Klassen gefunden");

    const isUsed = (name) => {
      if (ASSEMBLED_CLASSES[name]) return scripts.includes(ASSEMBLED_CLASSES[name]);
      const asWord = new RegExp(`(^|[^\\w-])${name}($|[^\\w-])`);
      return asWord.test(html) || asWord.test(scripts);
    };
    const unused = [...classes].filter((name) => !isUsed(name));
    assert.deepEqual(unused, [], "ungenutzte CSS-Klassen");
  });

  it("jedes Feld, das app.js befüllt, gibt es im HTML", () => {
    // field("name") / cartField("total") look up [data-field="…"].
    const fields = new Set([...scripts.matchAll(/\b(?:field|cartField)\("([\w]+)"\)/g)].map((match) => match[1]));
    assert.ok(fields.size > 20, "Plausibilität: Felder gefunden");
    const missing = [...fields].filter((name) => !html.includes(`data-field="${name}"`));
    assert.deepEqual(missing, [], "Felder ohne Gegenstück im HTML");
  });

  it("jede Aktion im HTML hat eine Behandlung in app.js", () => {
    const actions = new Set([...html.matchAll(/data-action="([\w-]+)"/g)].map((match) => match[1]));
    const unhandled = [...actions].filter((action) => !scripts.includes(`"${action}"`));
    assert.deepEqual(unhandled, [], "Buttons ohne Funktion");
  });
});
