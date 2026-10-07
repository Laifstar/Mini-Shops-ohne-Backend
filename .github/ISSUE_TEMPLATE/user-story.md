---
name: User Story
about: Neues Ticket für das Backlog (User Story mit Akzeptanzkriterien)
title: ""
labels: ["feature"]
assignees: []
---

## User Story

Als **<Rolle>** möchte ich **<Ziel>**, **damit** <Nutzen>.

## Beschreibung / Kontext

<!-- Was genau soll umgesetzt werden? Was gehört ausdrücklich NICHT dazu? -->

## Akzeptanzkriterien

<!-- Prüfbar formulieren: Jemand anderes muss eindeutig „erfüllt / nicht erfüllt“ sagen können. -->

- [ ] …
- [ ] …

## Technische Hinweise

<!-- Betroffene Dateien, Werkzeuge, Hinweise für die Umsetzung -->

## Schätzung & Priorität

- Größe: S / M / L
- Priorität (MoSCoW): Must / Should / Could / Won't
- Abhängig von: #

## Definition of Done

- [ ] Alle Akzeptanzkriterien erfüllt und im Browser geprüft
- [ ] Code nachvollziehbar kommentiert (das *Warum*, nicht das *Was*)
- [ ] Keine Fehler in der DevTools-Konsole
- [ ] Nachweise erzeugt (`npm run qa:evidence -- <nr>`): axe-core ohne Verstöße, Lighthouse ≥ 90
- [ ] Pull Request mit der Review-Checkliste geprüft (Selbst-Review als Kommentar im PR)
