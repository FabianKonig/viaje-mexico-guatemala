# TODO

## Von Hand zu erledigen (Autor)

- [x] Branch-Schutz: Ruleset `protect-main-branch` (aktiv, Default Branch): Restrict deletions,
      Require linear history, Require a pull request, Block force pushes, **Require status checks to
      pass (`Tests`)**.
- [x] Ruleset: „Require branches to be up to date before merging“ aktiv (Voraussetzung dafür, dass die Tests beim Merge in `main` nicht erneut laufen).
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
- [x] Beispielbeitrag vor dem ersten echten Beitrag löschen (mit Beitrag 1 erledigt; als Testinhalt
      nach `tests/fixtures/content/` verschoben)

## Medien-Import (Fotos und Videos vom Handy)

- [x] Google-Drive-Konnektor verbunden, Ordner `reiseblog-viaje-mexico-guatemala` angelegt (Unterordner je
      Beitrag, siehe AGENTS.md › Medien holen). Fotos bis 10 MB und Bewegtfotos laden direkt,
      größere Dateien über eine kurze Kopie (getestet).
- [ ] **Nach großen Videos:** im Drive-Papierkorb die `tmp-*`-Kopien endgültig löschen (der Agent
      kann das nicht).
- [ ] Mit einem echten Android-Video prüfen, dass es nach dem Import auf Handy und Computer mit Ton
      abgespielt wird.
- [x] Android-„Bewegte Fotos“ als stumme Schleife über dem Foto.
- [ ] **Lern-Datei (Spanisch):** beim ersten echten Beitrag mit Spanisch prüfen: HTML-Upload als Google Doc
      (Überschriften, Tabellen), ob `update_file` den Inhalt des Sammel-Docs ersetzen kann, und das Ergebnis
      in AGENTS.md › Spanisch-Lernhilfe festhalten.
- [ ] Erster echter Beitrag aus Drive (Text-Doc: Format von Titel und Titelbild-Hinweis danach in
      AGENTS.md festhalten).

## Hinweise zu den Grenzen

- Öffentliches Repository: Jeder GitHub-Nutzer darf es ansehen und forken (GitHub-Nutzungsbedingungen).
  Forks bleiben bestehen, auch wenn das Repository später privat wird. Fotos lassen sich herunterladen.

## Umsetzung (Pull-Requests)

- [x] PR 1: Grundgerüst, .gitignore, LICENSE, Dokumente, Test- und CI-Gerüst, Dependabot
- [x] PR 2: Design und Startseite, Datenmodell, Beispielbeitrag, Layout- und axe-Tests
- [x] PR 3: Beitragsseite mit Zweisprachigkeit
- [x] PR 4: Fotos und Lightbox inkl. Bildskript, Videos (später durch eigene Clips ersetzt, YouTube entfernt)
- [x] PR 5: Karte inkl. Ortsliste
- [x] PR 6: Reisetag
- [x] PR 7: PWA
- [x] PR 8: Impressum, Datenschutz, noindex, Lizenzhinweise
- [x] PR 9: Deployment über GitHub Actions (keine Vorschau-Seiten, Entscheidung des Autors; PR-Artefakte später wieder entfernt)
- [x] Medien-Import und eigene Videos (`clips`): Import-Skript, Anzeige mit Ton, Größenwarnung
- [x] PR 10: Cross-Browser-Tests (PR: Chromium, Firefox, WebKit, Pixel 7, iPhone 15; nächtlich: Edge, Chrome, iPad, Galaxy) und manuelle Checkliste
