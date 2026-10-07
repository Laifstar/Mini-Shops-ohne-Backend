# DOPPIO: Mini-Shop ohne Backend

Klickbare Kundendemo eines Mini-Shops für **DOPPIO**, einen hoch konzentrierten Energy Drink
in der 150-ml-Dose mit der Koffeinmenge einer 500-ml-Dose.
**„Der Espresso unter den Energy Drinks.“**

Schulprojekt LF10a (Benutzerschnittstellen gestalten und entwickeln), Projekt 1 „Mini-Shop-UI“.

## Worum es geht

Der Shop entsteht **Schritt für Schritt über GitHub-Issues**. Im Mittelpunkt steht der
Arbeitsablauf: planen mit Issues, umsetzen im eigenen Branch, prüfen per Pull Request,
mergen, Issue kommentieren und abschließen.

- **Board:** [DOPPIO: Mini-Shop ohne Backend](https://github.com/users/Laifstar/projects/2/views/2)
  (Todo → In progress → In review → Done)
- **Issues:** [Backlog](https://github.com/Laifstar/Mini-Shops-ohne-Backend/issues)

## Ablauf pro Issue

1. Issue auf dem Board nach **In progress** ziehen.
2. Branch von `main` anlegen: `feature/<nr>-<kurzname>`, z. B. `feature/3-detailmodal`.
3. In kleinen Schritten committen: [Conventional Commits](https://www.conventionalcommits.org/de/)
   auf Englisch, mit Bezug `Refs #<nr>` in der Nachricht.
4. Prüfen: `npm test` und `npm run qa:evidence -- <nr>` (Nachweise, siehe unten).
5. Pushen und Pull Request öffnen (auf Englisch) mit `Closes #<nr>`. Board: **In review**.
6. Selbst-Review mit der Checkliste aus der PR-Vorlage, Ergebnis als Kommentar im PR.
7. Mergen per Merge-Commit (kein Squash, die einzelnen Commits bleiben sichtbar), Branch löschen.
   GitHub schließt das Issue, das Board springt auf **Done**.
8. Abschlusskommentar im Issue: was umgesetzt wurde, Link zu PR und Nachweisen.

`main` wird nur über Pull Requests geändert. Einzige Ausnahme ist die Grundausstattung
(dieser Stand: README, Vorlagen, Prüfwerkzeuge).

## Starten

Kein Server, kein Build: **`index.html` per Doppelklick öffnen.**
Alternativ in VS Code mit der Erweiterung *Live Server* („Go Live“).

## Funktionen

| Funktion | Issue |
|----------|-------|
| Grundgerüst: Header, Hero mit Dosenvergleich, Footer; Produktdaten als JavaScript-Modul | #1 |
| Listenansicht: 6 Sorten als Karten mit Bild, Preis, Grundpreis pro Liter und Merkmalen, 1/2/3 Spalten je nach Bildschirm | #2 |
| Detailmodal: „Details“ öffnet Beschreibung, Preis, Koffein-Pflichthinweis, Nährwerttabelle (pro 100 ml und pro Dose) und Zutaten des angeklickten Produkts | #3 |
| Modal schließen per ✕-Button, Klick auf den Hintergrund oder Esc; Fokus kehrt zum Auslöser zurück; Seite dahinter gesperrt, ohne seitlichen Sprung; Einblenden nur ohne „Bewegung reduzieren“ | #4 |
| In den Warenkorb: Menge 1–24 im Detailmodal, Bestätigung, Anzahl im Header, höchstens 24 Dosen pro Sorte, bleibt nach dem Neuladen erhalten (`localStorage`) | #10 |
| Warenkorb ansehen und bearbeiten: Zeilen mit Preis pro Dose und Zeilensumme, Menge mit + und −, Sorte entfernen, Warenkorb leeren, Zwischensumme, Pfand und Gesamt, Hinweis bei leerem Warenkorb, „Zur Kasse“ als Demo | #11 |
| Barrierefreiheit geprüft: Einkauf nur per Tastatur, eindeutige Namen für Screenreader, 320 px / 200 % Zoom, Textabstände, Kontraste, Windows-Kontrastmodus ([Prüfprotokoll](docs/barrierefreiheit.md)) | #12 |

## Aufbau

```text
index.html        Struktur und <template>-Bausteine
css/styles.css    Design Tokens, Basis, Komponenten (mobile first)
js/data.js        Produktdaten (ersetzt das Backend)
js/cart.js        Warenkorb-Logik ohne DOM-Code, speichert in localStorage
js/app.js         Darstellung und Events
tests/            Browser-Tests, eine Datei pro Issue
scripts/          Prüf- und Screenshot-Werkzeuge
```

## Qualitätssicherung und Nachweise

Für die Seite selbst ist kein npm nötig, nur für die Prüfwerkzeuge (Node.js ≥ 20 und ein installiertes Chrome):

```bash
npm install
npm test                                  # Browser-Tests gegen index.html
npm run lint:html                         # HTML-Validierung
npm run qa:evidence -- <nr>               # Screenshots, axe-core, Lighthouse → docs/screenshots/issue-<nr>/
npm run screenshot:github -- board <name> # Board, issue:<nr> oder pr:<nr> → docs/screenshots/prozess/
```

| Ordner | Inhalt |
|--------|--------|
| `docs/screenshots/issue-<nr>/` | Stand nach dem Issue: Screenshots Desktop und Mobil, axe-core-Ergebnis, Lighthouse-Reports, Zusammenfassung in `ergebnis.md` |
| `docs/screenshots/prozess/` | Verlauf auf GitHub: Board, Issues mit Kommentaren, Pull Requests (fortlaufend nummeriert) |

## Prüfung und Review

| Dokument | Inhalt |
|----------|--------|
| [docs/testprotokoll.md](docs/testprotokoll.md) | Abschluss-Testrunde (#5): Akzeptanzkriterien, 63 automatische Tests, Lastprobe, Browser, alle gefundenen Fehler, manuelle Prüfliste fürs Team |
| [docs/review-checkliste.md](docs/review-checkliste.md) | Review-Checkliste mit Prüfwegen, Schweregraden und Übersicht aller Reviews; Icebox |
| [docs/barrierefreiheit.md](docs/barrierefreiheit.md) | Prüfprotokoll Barrierefreiheit (#12) |

`screenshot:github` arbeitet ohne Anmeldung und funktioniert deshalb nur, solange Repository und Board öffentlich sind.
