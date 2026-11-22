# TODO

## Von Hand zu erledigen (Autor)

- [ ] **Branch-Schutz vervollständigen:** Das Ruleset `protect-main-branch` (aktiv, Default Branch:
      Restrict deletions, Require linear history, Require a pull request, Block force pushes) ist
      angelegt ✔. **Es fehlt noch „Require status checks to pass“:** Ruleset öffnen → Häkchen setzen →
      „Add checks“ → `Tests` auswählen (erscheint, sobald der Check einmal gelaufen ist) → Speichern.
      Optional „Require branches to be up to date before merging“. Erinnerung bleibt, bis erledigt.
- [ ] **Nur Squash-Merges erlauben:** Settings → General → Pull Requests: nur „Allow squash merging“
      anhaken, „Allow merge commits“ und „Allow rebase merging“ abwählen. Zusätzlich
      „Automatically delete head branches“ anhaken.
- [x] DNS-Eintrag `viaje` → `fabiankonig.github.io` (geprüft: zeigt auf GitHub Pages).
- [x] GitHub Pages: Source „GitHub Actions“, Custom domain `viaje.fabiankonig.de`, „Enforce HTTPS“.
- [ ] **Nach dem Merge von PR 9:** prüfen, dass unter Actions der Lauf „Deploy“ grün ist und
      https://viaje.fabiankonig.de die Seite zeigt. Falls „Deploy“ wegen der Umgebung `github-pages`
      abgelehnt wird: Settings → Environments → github-pages → Deployment branches → `main` erlauben.
- [ ] **Domain verifizieren** (empfohlen, schützt vor Übernahme der Subdomain): Profil → Settings →
      Pages → „Add a domain“ → `fabiankonig.de` → angezeigten TXT-Eintrag beim Domain-Anbieter setzen.
- [ ] **Name für Copyright-Zeile und Impressum** angeben (ersetzt `[VOLLER NAME]` in `src/config.ts` und `LICENSE`).
- [ ] **Impressumsdaten** angeben: Straße und Hausnummer, PLZ Ort, E-Mail.
- [ ] **Impressum und Datenschutz prüfen lassen** (z. B. mit einem Generator wie dem von eRecht24 oder
      durch eine Fachperson), bevor der Link geteilt wird. Die Texte sind keine Rechtsberatung.
- [ ] **WhatsApp-Vorschau testen**, sobald die Seite online ist: Link in einen Chat mit dir selbst
      schicken. Erscheint kein Bild/Titel, melden (robots.txt sperrt alles, bewusst).
- [ ] **LICENSE-Wortlaut** bei Bedarf rechtlich prüfen lassen.
- [ ] **Profilfoto** ablegen (`content/profile.jpg`, quadratisch, mind. 300 × 300 px, ohne Standort).
- [ ] **Manuelle Tests** auf echten Geräten (Checkliste folgt in PR 10: MANUAL-TESTS.md).
- [ ] Beispielbeitrag `content/posts/2026-11-23-entrada-de-ejemplo/` vor dem ersten echten Beitrag löschen
      (ein Agent macht das beim ersten echten Beitrag mit).

## Hinweise zu den Grenzen

- Öffentliches Repository: Jeder GitHub-Nutzer darf es ansehen und forken (GitHub-Nutzungsbedingungen).
  Forks bleiben bestehen, auch wenn das Repository später privat wird. Fotos lassen sich herunterladen.

## Umsetzung (Pull-Requests)

- [x] PR 1: Grundgerüst, .gitignore, LICENSE, Dokumente, Test- und CI-Gerüst, Dependabot
- [x] PR 2: Design und Startseite, Datenmodell, Beispielbeitrag, Layout- und axe-Tests
- [x] PR 3: Beitragsseite mit Zweisprachigkeit
- [x] PR 4: Fotos und Lightbox inkl. Bildskript, Zwei-Klick-Videos
- [x] PR 5: Karte inkl. Ortsliste
- [x] PR 6: Reisetag
- [x] PR 7: PWA
- [x] PR 8: Impressum, Datenschutz, noindex, Lizenzhinweise
- [x] PR 9: Deployment über GitHub Actions, PR-Artefakte (keine Vorschau-Seiten, Entscheidung des Autors)
- [ ] PR 10: Cross-Browser-Tests und manuelle Checkliste
