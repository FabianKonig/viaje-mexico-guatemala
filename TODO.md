# TODO

## Von Hand zu erledigen (Autor)

- [x] Branch-Schutz: Ruleset `protect-main-branch` (aktiv, Default Branch): Restrict deletions,
      Require linear history, Require a pull request, Block force pushes, **Require status checks to
      pass (`Tests`)**.
- [x] Nur Squash-Merges erlaubt, „Automatically delete head branches“ aktiv.
- [x] DNS-Eintrag `viaje` → `fabiankonig.github.io` (geprüft: zeigt auf GitHub Pages).
- [x] GitHub Pages: Source „GitHub Actions“, Custom domain `viaje.fabiankonig.de`, „Enforce HTTPS“.
- [x] **Nach dem Merge von PR 9:** prüfen, dass unter Actions der Lauf „Deploy“ grün ist und
      https://viaje.fabiankonig.de die Seite zeigt. Falls „Deploy“ wegen der Umgebung `github-pages`
      abgelehnt wird: Settings → Environments → github-pages → Deployment branches → `main` erlauben.
- [x] Domain `fabiankonig.de` bei GitHub verifiziert (TXT-Eintrag `_github-pages-challenge-FabianKonig`,
      geprüft), schützt die Subdomain vor Übernahme.
- [x] Name, Anschrift und E-Mail eingetragen (wie im Impressum von Palabrita), in `src/config.ts` und `LICENSE`.
- [ ] **Impressum und Datenschutz prüfen lassen** (z. B. mit einem Generator wie dem von eRecht24 oder
      durch eine Fachperson), bevor der Link geteilt wird. Die Texte sind keine Rechtsberatung.
- [ ] **WhatsApp-Vorschau testen**, sobald die Seite online ist: Link in einen Chat mit dir selbst
      schicken. Erscheint kein Bild/Titel, melden (robots.txt sperrt alles, bewusst).
- [ ] **LICENSE-Wortlaut** bei Bedarf rechtlich prüfen lassen.
- [x] Profilfoto abgelegt (`content/profile.jpg`, PR #13).
- [ ] **Manuelle Tests** auf echten Geräten nach [MANUAL-TESTS.md](MANUAL-TESTS.md) (iPhone Safari,
      Android Chrome, **Samsung Internet**, Firefox Android, iPad, Mac Safari, Windows Edge).
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
- [x] PR 10: Cross-Browser-Tests (PR: Chromium, Firefox, WebKit, Pixel 7, iPhone 15; nächtlich: Edge, Chrome, iPad, Galaxy) und manuelle Checkliste
