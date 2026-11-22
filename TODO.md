# TODO

## Von Hand zu erledigen (Autor)

- [ ] **Branch `main` schützen** (GitHub → Settings → Rules → Rulesets → „New branch ruleset“,
      Ziel „Default branch“): „Require a pull request before merging“, „Require status checks to
      pass“ (Check „Tests“ auswählen), „Block force pushes“, „Restrict deletions“. Erinnerung bleibt,
      bis erledigt.
- [ ] **Nur Squash-Merges erlauben:** Settings → General → Pull Requests: nur „Allow squash merging“
      anhaken, „Allow merge commits“ und „Allow rebase merging“ abwählen. Zusätzlich
      „Automatically delete head branches“ anhaken.
- [ ] **DNS-Eintrag** beim Domain-Anbieter: `CNAME`-Eintrag für `viaje` → `fabiankonig.github.io.`
- [ ] **GitHub Pages einrichten** (nach PR 9): Settings → Pages → Source „Deploy from a branch“,
      Branch `gh-pages` / `(root)`, Custom domain `viaje.fabiankonig.de`, „Enforce HTTPS“ anhaken.
- [ ] **Domain verifizieren** (empfohlen): Profil-Settings → Pages → „Add a domain“ → TXT-Eintrag setzen.
- [ ] **Name für Copyright-Zeile und Impressum** angeben (ersetzt `[VOLLER NAME]` in `src/config.ts` und `LICENSE`).
- [ ] **Impressumsdaten** angeben: Straße und Hausnummer, PLZ Ort, E-Mail.
- [ ] **Impressum und Datenschutz prüfen lassen** (Generator oder Fachperson), bevor der Link geteilt wird.
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
- [ ] PR 3: Beitragsseite mit Zweisprachigkeit
- [ ] PR 4: Fotos und Lightbox inkl. Bildskript, Zwei-Klick-Videos
- [ ] PR 5: Karte inkl. Ortsliste
- [ ] PR 6: Reisetag
- [ ] PR 7: PWA
- [ ] PR 8: Impressum, Datenschutz, noindex, Lizenzhinweise
- [ ] PR 9: Deployment und Vorschauen
- [ ] PR 10: Cross-Browser-Tests und manuelle Checkliste
