# Nachweise Issue #4

Erzeugt am 07.10.2026, 20:27 mit `npm run qa:evidence -- 4` (Commit 34a7e7c).

## Lighthouse 13 ([Mobil](lighthouse-mobil.html), [Desktop](lighthouse-desktop.html))

| Ansicht | Performance | Barrierefreiheit | Best Practices | SEO |
|---|---|---|---|---|
| Mobil | 100 | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

![Lighthouse Mobil](lighthouse-mobil.png)

## axe-core 4.14.0 (WCAG 2.2 A/AA + Best Practices)

| Zustand | Ansicht | Verstöße | Bestanden | Manuell prüfen |
|---|---|---|---|---|
| Startzustand | desktop | 0 | 35 | 1 |
| Startzustand | mobil | 0 | 35 | 1 |
| Detailmodal geöffnet | desktop | 0 | 26 | 1 |
| Detailmodal geöffnet | mobil | 0 | 26 | 1 |

Keine Verstöße.

„Manuell prüfen“ sind Regeln, die axe nicht automatisch entscheiden kann (z. B. Kontrast auf Farbverläufen).
Details stehen in [axe.json](axe.json).

## Browserkonsole

Keine Fehler oder Warnungen.

## Screenshots

![Startzustand, desktop](start-desktop.png)
![Startzustand, mobil](start-mobil.png)
![Detailmodal geöffnet, desktop](detailmodal-desktop.png)
![Detailmodal geöffnet, mobil](detailmodal-mobil.png)
