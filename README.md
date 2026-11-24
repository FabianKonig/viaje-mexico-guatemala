# Un viaje a México y Guatemala

Zweisprachiger Reiseblog (Spanisch im Original, deutsche Übersetzung) als statische Seite,
gebaut mit [Astro](https://astro.build) und ausgeliefert über GitHub Pages unter
<https://viaje.fabiankonig.de>.

> **Nur zum Ansehen öffentlich.** Dieses Repository steht unter keiner Open-Source-Lizenz.
> Alle Rechte an Texten, Fotos, Code und Gestaltung sind vorbehalten (siehe [LICENSE](LICENSE)).
> Ausgenommen sind Bestandteile Dritter, z. B. die Schriften (SIL Open Font License) und die in
> [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) genannten Werkzeuge.

## Lokal bauen und testen

Voraussetzung: Node.js in der aktuellen LTS-Version (siehe `.nvmrc`, derzeit 26) und npm 12
(`npm install -g npm@12`). Alle Abhängigkeiten sind exakt gepinnt und werden aktuell gehalten
(Dependabot, `npm audit` in der CI).

```bash
npm ci                 # Abhängigkeiten installieren (genau nach package-lock.json)
npm run dev            # Entwicklungsserver auf http://localhost:4321
npm run build          # Seite bauen → dist/ (inkl. Bildverarbeitung und Prüfungen)
npm run serve          # dist/ lokal ausliefern (wie GitHub Pages)

npm run lint           # Formatierung, .gitignore-Prüfung
npm run test:unit      # Unit-Tests (Vitest)
npm run build:e2e      # baut dist/ und die Vorschau-Variante dist-preview/
npm run test:e2e       # Browser-Tests (Playwright)
npm test               # alles zusammen
```

Für Browser-Tests einmalig die Browser installieren: `npx playwright install --with-deps chromium firefox webkit`.
Manuelle Gerätetests: [MANUAL-TESTS.md](MANUAL-TESTS.md).
Weitere Befehle (Cross-Browser, Layout, Barrierefreiheit) stehen in [AGENTS.md](AGENTS.md#tests).

## Veröffentlichung

Jeder Pull-Request wird getestet, jeder Merge in `main` wird automatisch gebaut und über GitHub Actions auf GitHub Pages
veröffentlicht (`.github/workflows/deploy.yml`). Details: [SPEC.md › Deployment](SPEC.md#8-deployment).

## Mitarbeit

Änderungen nur per Pull-Request auf `main`, Tests müssen grün sein, gemergt wird **immer per
„Squash and merge“**.

## Dokumente

- [AGENTS.md](AGENTS.md): Anleitung für Agenten (neuer Beitrag, Pflege, Regeln)
- [SPEC.md](SPEC.md): vollständige Spezifikation
- [TODO.md](TODO.md): offene Aufgaben, auch die von Hand zu erledigenden

## Wichtig: Fotos und GPS-Daten

Alles, was ins Repository hochgeladen wird, ist **öffentlich und bleibt für immer in der
Git-Historie**, auch wenn die Datei später gelöscht wird. Handyfotos enthalten oft den genauen
Aufnahmeort (GPS) in den EXIF-Metadaten. Der Import (`scripts/import-media.mjs`) entfernt alle
Metadaten und verkleinert die Dateien, **bevor** etwas eingecheckt wird. Wer Fotos trotzdem selbst
ins Repository lädt (z. B. per GitHub im Browser), umgeht das: Dann liegt die Originaldatei samt GPS
in der Historie. Deshalb Fotos nie direkt hochladen, sondern über den Import, oder zumindest
**schon auf dem Handy verkleinern und ohne Standort**:

- **iPhone:** In der Fotos-App das Foto öffnen → Teilen → oben „Optionen“ → „Ort“ ausschalten.
  Zum Verkleinern z. B. in der Mail- oder Kurzbefehle-App „Bildgröße ändern“ (z. B. 2000 px) nutzen.
  Dauerhaft: Einstellungen → Datenschutz → Ortungsdienste → Kamera → „Nie“.
- **Android:** In Google Fotos Foto öffnen → ⋮ → Details → „Standort entfernen“ bzw. beim Teilen
  „Standortdaten entfernen“ aktivieren. Dauerhaft: Kamera-App → Einstellungen → „Standort-Tags“ aus.
  Zum Verkleinern z. B. beim Teilen „Größe ändern“/„Klein“ wählen.
- Unbearbeitete Originale lokal nur im Ordner `_originals/` ablegen, er ist per `.gitignore`
  ausgeschlossen.

**.gitignore wirkt nur auf noch nicht eingecheckte Dateien.** Eine Datei, die schon einmal committet
wurde, bleibt in der Historie, auch wenn sie später in `.gitignore` steht. Sie entfernt man aus
dem aktuellen Stand mit `git rm --cached <datei>`, aus der Historie nur durch Umschreiben der
Historie (z. B. `git filter-repo`) und erneutes Hochladen, und Forks oder Kopien sind dann
trotzdem schon in der Welt.

**Fotos und Videos nie unbearbeitet einchecken.** Der Import (`node scripts/import-media.mjs`, siehe
AGENTS.md) verkleinert sie vorher: Fotos auf 1600 px, Videos auf 720p mit Ton, jeweils ohne GPS und
Metadaten. Die Originale bleiben bei dir (z. B. in Google Drive). So bleibt das Repository klein
(GitHub Pages erlaubt höchstens 1 GB; der Build warnt ab 700 MiB). Eigene Videos werden von der Seite
selbst ausgeliefert und erst nach dem Antippen von „Play“ geladen.

## Grenzen des Schutzes

- Weil das Repository öffentlich ist, darf es nach den GitHub-Nutzungsbedingungen jeder
  GitHub-Nutzer ansehen und forken. Forks bleiben bestehen, auch wenn das Repository später privat
  gestellt wird.
- Fotos und Texte auf der Seite lassen sich technisch immer herunterladen oder abfotografieren.
  Der Rechtevorbehalt in [LICENSE](LICENSE) verbietet die Nutzung, verhindert sie aber nicht.
- `noindex` und `robots.txt` halten seriöse Suchmaschinen fern, sind aber kein Zugriffsschutz.
