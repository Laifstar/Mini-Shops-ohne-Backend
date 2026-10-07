# Testprotokoll: Abschluss-Testrunde (Issue #5)

**Prüfgegenstand:** der gesamte Shop nach #1–#4, #10–#12
**Umgebung:** macOS 27.0, Chrome 154 (headless über Puppeteer), Node.js 26.5, axe-core 4.14, Lighthouse 13.5
**Zum Nachvollziehen:** `npm install && npm test` sowie `npm run qa:evidence -- 5`

## 1 Akzeptanzkriterien von #5

| Kriterium | Prüfung | Ergebnis |
|---|---|---|
| Die Produktliste wird beim Laden korrekt angezeigt | `tests/issue-2-produktliste.test.mjs`: 6 Karten aus dem Array, Name, Preis, Grundpreis, Bild, Merkmale, 1/2/3 Spalten | ✅ |
| Das richtige Produkt öffnet sich im Modal | `tests/issue-3-detailmodal.test.mjs` öffnet das Modal für **alle sechs** Produkte und vergleicht Name, Preis und Beschreibung mit den Daten | ✅ |
| Der Schließen-Button funktioniert | `tests/issue-4-modal-schliessen.test.mjs`: ✕, Klick auf den Hintergrund, Esc, Fokus zurück; ebenso für den Warenkorb in `issue-11` | ✅ |
| Keine relevanten Fehler in der Browserkonsole | Jede der 8 Testdateien sammelt Konsolen-Fehler und -Warnungen und schlägt bei jeder Meldung fehl; der Nachweis-Lauf prüft fünf Zustände auf Desktop und mobil | ✅ 0 Meldungen |
| Der Pull Request wurde mit einer Review-Checkliste geprüft | Jeder PR des Projekts, einschließlich des PR zu diesem Issue: [Review-Checkliste und Übersicht aller Reviews](review-checkliste.md) | ✅ |
| Gefundene Fehler oder Verbesserungen sind dokumentiert | Abschnitt 4 dieses Protokolls, die Review-Übersicht und das [Prüfprotokoll Barrierefreiheit](barrierefreiheit.md) | ✅ |

## 2 Automatische Tests

| Datei | Issue | Tests |
|---|---|---|
| `issue-1-projektgrundlage.test.mjs` | #1 | 5 |
| `issue-2-produktliste.test.mjs` | #2 | 8 |
| `issue-3-detailmodal.test.mjs` | #3 | 9 |
| `issue-4-modal-schliessen.test.mjs` | #4 | 11 |
| `issue-10-warenkorb-fuellen.test.mjs` | #10 | 10 |
| `issue-11-warenkorb-bearbeiten.test.mjs` | #11 | 10 |
| `issue-12-barrierefreiheit.test.mjs` | #12 | 7 |
| `issue-5-qualitaet.test.mjs` (neu) | #5 | 3 |
| **Summe** | | **63** |

**Neu in dieser Testrunde:** [`issue-5-qualitaet.test.mjs`](../tests/issue-5-qualitaet.test.mjs) prüft den Quelltext statt der Seite.

- Wird jede CSS-Klasse auch verwendet? Anlass war die ungenutzte Regel, die seit #8 unbemerkt in `main` lag. Die Gegenprobe mit einer eingefügten Streuregel wird rot.
- Gibt es jedes Feld, das `app.js` befüllt, auch im HTML?
- Hat jede Aktion eines Buttons auch eine Behandlung im JavaScript?

**Gegenproben:** Für jedes Issue wurde der zentrale Fehler einmal absichtlich eingebaut, und der passende Test musste rot werden. Zwei Tests haben das zunächst nicht geschafft und wurden korrigiert: die leere Liste in #2 und der Umbruch im Header in #10.

### Stabilität

| Lauf | Ergebnis | Dauer |
|---|---|---|
| Normal, mehrfach während der Entwicklung | grün | ca. 45 s |
| **Lastprobe:** drei vollständige Läufe gleichzeitig (24 Chrome-Instanzen) | 3 × 60/60 grün | 6–7 min |

Beim Review von #15 lief der Scroll-Test aus #3 **einmal** in einen Timeout. Er war in keinem weiteren Lauf reproduzierbar, auch nicht unter dreifacher Last. Status: **beobachten**. Bei einem erneuten Auftreten wird der Test genauer instrumentiert.

Zwei frühere Ursachen für unzuverlässige Tests sind behoben, beide in #4:
- Ein zeitliches Rennen mit dem `close`-Ereignis, das den Fokus zurücksetzt.
- Messungen während der Einblend-Animation.

## 3 Browser und Geräte

| Browser | Automatisch | Manuell |
|---|---|---|
| Chrome (macOS) | ✅ alle 63 Tests, Nachweise | – |
| Firefox (macOS) | ❌ versucht: Puppeteer kann Firefox steuern, aber macOS verweigert dem Testprozess den Zugriff auf Firefox' Programmdaten („Operation not permitted“) | **offen**, siehe Abschnitt 5 |
| Safari (macOS) | ❌ setzt eine einmalige Freigabe mit Administratorrechten voraus (`safaridriver --enable`) | **offen** |
| Safari (iPhone) | ❌ nicht emulierbar | **offen** |

## 4 Gefundene Fehler und Verbesserungen im Projekt

| Nr. | Wo gefunden | Befund | Status |
|---|---|---|---|
| N1 | Review #6 | Pfandbetrag doppelt gepflegt (Text und Daten) | ✅ behoben in #7 |
| – | Gegenprobe #7 | Test „jedes Produkt hat Name, Preis, Bild“ war bei leerer Liste grün | ✅ behoben vor dem PR |
| S2 | Nachweis-Lauf #8 | Scrollbereich im Modal per Tastatur unerreichbar (axe: schwerwiegend) | ✅ behoben in #8 |
| S3 | Review #8, Runde 1 | toter Code im Detailmodal | ✅ behoben in #8, Runde 2 |
| – | Review #8 | Modal auf Touch-Geräten nicht schließbar (bekannt, Umfang von #4) | ✅ behoben in #9 |
| – | Tests #9 | Zeitliches Rennen beim Fokus, Messung während der Animation | ✅ behoben in #9 |
| – | Arbeit an #14 | ungenutzte CSS-Regel seit #8, im Review übersehen | ✅ behoben in #14, Test in #5 |
| S4 | Screenshot #14 | „Energy Shot“ bricht bei 390 px um | ✅ behoben in #14 |
| B1 | Prüfung #16 | Fokusrahmen im Modal-Inhalt unsichtbar | ✅ behoben in #16 |
| B2 | Prüfung #16 | +/−-Buttons im Warenkorb mehrdeutig benannt | ✅ behoben in #16 |
| B3 | Prüfung #16 | Warenkorb-Zeile bei 320 px abgeschnitten | ✅ behoben in #16 |
| B4 | Prüfung #16 | gesperrte Buttons im Windows-Kontrastmodus nicht erkennbar | ✅ behoben in #16 |
| – | Review #15 | Scroll-Test einmal mit Timeout | 🔍 beobachten (Abschnitt 2) |
| N3, N6, N7, N9, N10, N11 | Reviews | kleine Punkte, begründet belassen | ➖ bewusst belassen |
| N8 | Review #15 | leerer Warenkorb ohne Weg zurück | 🧊 Icebox |

## 5 Manuelle Prüfungen für das Team

Diese Prüfungen brauchen echte Geräte oder einen Menschen. Sie lassen sich von hier aus nicht automatisieren. Bitte vor der Abgabe durchführen und das Ergebnis eintragen:

| Prüfung | Schritte | Erwartung | Ergebnis | Wer, wann |
|---|---|---|---|---|
| iPhone, Safari | `index.html` über einen lokalen Server öffnen (z. B. Live Server), Modal öffnen, auf dem Hintergrund wischen | Seite dahinter scrollt nicht mit (aus #9) | ☐ | |
| Firefox (macOS) | Einkauf durchklicken: Details, 2 Dosen, Warenkorb, +, leeren | wie in Chrome, Konsole (F12) ohne Fehler | ☐ | |
| Safari (macOS) | wie Firefox | wie in Chrome | ☐ | |
| VoiceOver (macOS) | Cmd+F5, mit VO+Pfeiltasten durch Liste, Modal und Warenkorb; Rotor (VO+U) → Schaltflächen | Ansagen verständlich, Buttons im Rotor eindeutig (B2), Bestätigungen werden angesagt | ☐ | |
| Windows, Kontrastmodus | Einstellungen → Barrierefreiheit → Kontrastdesigns; Warenkorb mit 1 Dose öffnen | „−“ erkennbar gesperrt (B4) | ☐ | |

## 6 Ergebnis

Alle Akzeptanzkriterien von #5 sind erfüllt:
- 63 automatische Tests sind grün, auch unter Last.
- Die Konsole bleibt in allen Zuständen frei von Meldungen.
- Jeder PR wurde mit der Checkliste geprüft.
- Alle gefundenen Fehler sind dokumentiert. Bis auf einen beobachteten, nicht reproduzierbaren Test-Timeout sind sie behoben oder begründet zurückgestellt.

Offen sind nur die manuellen Prüfungen aus Abschnitt 5, die echte Geräte oder einen Menschen brauchen.
