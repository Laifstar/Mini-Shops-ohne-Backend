## What and why

<!-- 2–3 sentences: what does this PR change, and which problem does it solve? -->

## Issue

<!-- "Closes #n" closes the issue automatically when the PR is merged. -->
Closes #

## How to test

<!-- Steps the reviewer can follow, e.g. "Open index.html, click 'Details' on DOPPIO Zero …" -->
1.

## Evidence

<!-- Generated with `npm run qa:evidence -- <n>`, see docs/screenshots/issue-<n>/ergebnis.md -->
- Lighthouse mobile / desktop:
- axe-core violations:
- Screenshots:

---

## Review checklist

The author ticks every box before asking for review (self-check). The reviewer verifies each item
independently and does not rely on the ticks.

**A. Scope**
- [ ] A1 Issue linked, what and why described
- [ ] A2 All acceptance criteria of the issue met and checked in the browser
- [ ] A3 Only changes that belong to this issue

**B. Code quality**
- [ ] B1 Clear names, no dead code, no leftover `console.log`
- [ ] B2 Comments explain the why, not the what
- [ ] B3 No duplication, no `innerHTML` with data, no external resources
- [ ] B4 HTML valid (`npm run lint:html`), browser console free of errors and warnings

**C. Layout**
- [ ] C1 No horizontal scrolling at 320, 390, 768 and 1280 px
- [ ] C2 Touch targets at least 24 px (goal: 44 px)

**D. Accessibility**
- [ ] D1 Fully operable by keyboard, focus always visible
- [ ] D2 axe-core reports 0 violations in every captured state
- [ ] D3 Contrast at least 4.5:1 for text and 3:1 for UI elements

**E. Lighthouse**
- [ ] E1 Performance, Accessibility, Best Practices and SEO at least 90 (mobile and desktop)

**F. Process**
- [ ] F1 Small commits in Conventional Commits format, each with `Refs #n`
- [ ] F2 `npm test` passes
- [ ] F3 Evidence committed in `docs/screenshots/issue-<n>/`
- [ ] F4 Issue is in "In review" on the project board
