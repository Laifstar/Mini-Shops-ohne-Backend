# Review-Checkliste und Reviews im Projekt

Teilaufgabe 1.4 des Arbeitsblatts: *Erstelle eine Review-Checkliste und wende sie auf einen Pull Request an.*

Die Checkliste steht als Vorlage in [`.github/pull_request_template.md`](../.github/pull_request_template.md). GitHub fügt sie in jeden neuen Pull Request ein. Die Vorlage ist auf Englisch, wie alle Pull Requests im Projekt. Dieses Dokument erklärt, **wie** jeder Punkt geprüft wird, und zeigt, wie die Checkliste in den Reviews tatsächlich angewendet wurde.

## 1 So wird geprüft

**Zwei Rollen, ein Formular:**
- Wer den PR erstellt, hakt vor dem Review jeden Punkt selbst ab (Selbstprüfung).
- Wer reviewt, prüft **jeden Punkt selbst nach** und verlässt sich nicht auf die Häkchen.

**Allein gearbeitet:** GitHub erlaubt es nicht, den eigenen PR freizugeben („Approve“) oder Änderungen anzufordern („Request changes“). Das Review wurde deshalb in der Rolle der Reviewerin als **Kommentar-Review** abgegeben. Die Entscheidung steht ausdrücklich im Text.

### Die Punkte und ihr Prüfweg

| Punkt | Bedeutung | Prüfweg |
|---|---|---|
| **A1** | Issue verlinkt, Was und Warum beschrieben | PR-Text: `Closes #n` vorhanden? Versteht man ohne den Code, was sich ändert und warum? |
| **A2** | Alle Akzeptanzkriterien erfüllt | Kriterien des Issues einzeln im Browser nachstellen; zu jedem Kriterium gibt es einen Test in `tests/issue-<n>-….test.mjs` |
| **A3** | Nur Änderungen, die zum Issue gehören | Tab „Files changed“: Gehört jede Datei, jede Zeile zum Issue? Vorgriffe auf spätere Issues zurückstellen |
| **B1** | Klare Namen, kein toter Code, kein `console.log` | Diff lesen; seit #5 findet `tests/issue-5-qualitaet.test.mjs` ungenutzte CSS-Klassen automatisch |
| **B2** | Kommentare erklären das Warum | Bei jedem Kommentar fragen: Steht hier, *warum* es so gelöst ist, oder nur, *was* der Code tut? |
| **B3** | Keine Duplikate, kein `innerHTML` mit Daten, keine externen Ressourcen | Diff nach `innerHTML`, `http` und kopierten Blöcken durchsuchen |
| **B4** | HTML valide, Konsole ohne Fehler | `npm run lint:html`; jede Testdatei prüft die Konsole automatisch mit |
| **C1** | Kein waagerechtes Scrollen bei 320, 390, 768 und 1280 px | DevTools-Gerätemodus, alle vier Breiten; Tests in #4 und #12 |
| **C2** | Touch-Ziele mindestens 24 px (Ziel 44 px) | Element in DevTools anklicken, Maße ablesen; nach Animationen messen (Lehre aus #9) |
| **D1** | Komplett per Tastatur bedienbar, Fokus immer sichtbar | Maus weglegen und den Ablauf mit Tab, Enter, Leertaste und Esc durchgehen; Test in #12 |
| **D2** | axe-core 0 Verstöße in jedem Zustand | `npm run qa:evidence -- <n>`, Abschnitt axe in `ergebnis.md` |
| **D3** | Kontrast 4,5 : 1 (Text) und 3 : 1 (Bedienelemente) | axe-Ergebnis plus Kontrast-Test aus #12 für Stellen, die axe nicht beurteilen kann |
| **E1** | Lighthouse ≥ 90 in allen vier Kategorien | `npm run qa:evidence -- <n>`, mobil und Desktop |
| **F1** | Kleine Commits im Conventional-Commits-Format mit `Refs #n` | Tab „Commits“ |
| **F2** | `npm test` grün | selbst ausführen, nicht nur dem Häkchen glauben |
| **F3** | Nachweise in `docs/screenshots/issue-<n>/` committet | Tab „Files changed“ |
| **F4** | Issue steht auf dem Board in „In review“ | Board öffnen; Achtung, die Board-Automatik setzt beim Öffnen des PR auf „In progress“ zurück (Lehre aus #6) |

### Schweregrade und Entscheidung

| Schweregrad | Bedeutung | Folge |
|---|---|---|
| **Blocker** | Funktion kaputt, Kriterium nicht erfüllt, Barriere | kein Merge, bis behoben |
| **Should (S)** | sollte vor dem Merge behoben werden | beheben oder begründet zurückstellen |
| **Nit (N)** | Kleinigkeit, Geschmack, Idee | darf bleiben, Entscheidung dokumentieren; gute Ideen in die Icebox |

Ein Befund ist erst dann gut formuliert, wenn er **konkret** ist (Datei und Zeile, im PR als Zeilenkommentar), **begründet** ist und einen **Vorschlag** enthält.

## 2 Angewendet: alle Reviews im Überblick

| PR | Issue | Runden | Befunde | Ergebnis |
|---|---|---|---|---|
| [#6](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/6) | #1 Projektgrundlage | 1 | N1 Pfand doppelt gepflegt (in #7 behoben), N2 vorbereitete Daten noch ungenutzt (gewollt) | gemergt |
| [#7](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/7) | #2 Produktliste | 1 | N3 `color-mix()` ohne Fallback (bewusst belassen); Test-Schwäche: leere Liste war „grün“ (vor dem PR behoben) | gemergt |
| [#8](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/8) | #3 Detailmodal | **2** | S2 Scrollbereich per Tastatur unerreichbar (behoben); **S3 toter Code** → Runde 1 „Changes needed“, Korrektur, Runde 2 ohne Befund | gemergt |
| [#9](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/9) | #4 Modal schließen | 1 | N6 `:has()` ohne Fallback (belassen); iPhone-Scroll-Sperre an #5 übergeben | gemergt |
| [#14](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/14) | #10 In den Warenkorb | 1 | S4 Umbruch im Header bei 390 px (behoben); in #8 übersehene CSS-Regel (behoben); N7 `localStorage` unter `file://` geteilt (belassen) | gemergt |
| [#15](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/15) | #11 Warenkorb bearbeiten | 1 | N8 leerer Warenkorb ohne Weg zurück (Icebox); N9 Footer-Buttons umbrechen bei 390 px (belassen); unzuverlässiger Test an #5 übergeben | gemergt |
| [#16](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/16) | #12 Barrierefreiheit | 1 | vier Barrieren B1–B4 im PR selbst behoben; N10, N11 (belassen) | gemergt |
| [#17](https://github.com/Laifstar/Mini-Shops-ohne-Backend/pull/17) | #5 Testen und Review | **2** | S5 Widerspruch im Testprotokoll (60 vs. 63 Tests) → Runde 1 „Changes needed“, Korrektur, Runde 2 ohne Befund | gemergt |
| PR zu #13 | #13 Vorgehen dokumentieren | 1 | siehe dort | – |

**Was die Reviews gebracht haben:**

- **Nicht jeder Befund kommt aus dem Review.** Manches fanden die Nachweise (S2), anderes ein Blick auf den Screenshot (S4). Einiges fand erst eine gezielte Prüfung (B1–B4). Das Review ist eine von mehreren Sicherungen.
- **Reviews übersehen auch etwas.** Die ungenutzte CSS-Regel aus #8 rutschte durch und fiel erst in #14 auf. Darauf folgt jetzt ein automatischer Test (B1-Prüfweg).
- **Zurückstellen ist eine Entscheidung.** Nits wurden nicht „vergessen“, sondern ausdrücklich belassen oder in die Icebox gelegt, mit Begründung im Zeilenkommentar.

## 3 Icebox

Ideen und kleine Verbesserungen, bewusst **nicht** in diesem Milestone:

| Idee | Herkunft | MoSCoW |
|---|---|---|
| Leerer Warenkorb mit Button „Sorten ansehen“ | Review #15 (N8) | Could |
| Fallback für `color-mix()` und `:has()` in alten Browsern | Reviews #7, #9 (N3, N6) | Won't (alle aktuellen Browser können es) |
| Filter „nur zuckerfrei“ und Sortierung nach Preis | alte Planung | Could |
| Deep-Link auf ein Produkt (`#produkt-id`) | alte Planung | Could |
| Echter Checkout und Bezahlung | alte Planung | Won't (ohne Backend nicht möglich) |
