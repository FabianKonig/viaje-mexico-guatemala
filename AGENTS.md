# AGENTS.md: Anleitung für Agenten

Diese Datei enthält alles, was ein Agent in einer **neuen Sitzung** wissen muss, um sofort einen
neuen Beitrag hinzuzufügen und die Seite zu pflegen. Die vollständige Spezifikation steht in
[SPEC.md](SPEC.md), offene Aufgaben in [TODO.md](TODO.md).

## Projektziel

Zweisprachiger Reiseblog „Un viaje a México y Guatemala“ (23.11.2026 bis 3.2.2027). Der Autor schreibt
auf Spanisch (Anfänger, teils gemischt mit eigenem Deutsch). Die Seite zeigt das **Original
unverändert** und daneben eine **deutsche Übersetzung**. Leser: Familie und Freunde (oft wenig
technikaffin), Link wird in WhatsApp geteilt. Statische Seite (Astro) auf GitHub Pages unter
<https://viaje.fabiankonig.de>.

Der Autor steuert vom Handy: **Rückmeldungen kurz halten** und am Ende immer nennen, was fertig ist
und was er noch von Hand tun muss.

## Arbeitsweise (immer)

1. Pro Aufgabe ein Feature-Branch von `main` (z. B. `post/2026-11-25-teotihuacan`, `feat/...`, `fix/...`).
2. Code, Tests **und** Dokumente (SPEC.md, AGENTS.md, TODO.md, README.md) im selben Pull-Request
   aktualisieren. **Spezifikation und Code müssen immer übereinstimmen.**
3. `npm test` lokal grün, Aussehen per Screenshot prüfen (Computer **und** Handy).
4. Pull-Request öffnen. Der Autor merged selbst, **immer per „Squash and merge“**.
5. Baut ein Pull-Request auf einem anderen, noch offenen auf: nach dessen Squash-Merge den Branch auf
   den neuen `main` rebasen (`git rebase --onto origin/main <alter-basis-commit>`) und mit
   `--force-with-lease` pushen (nur eigene Feature-Branches).
6. Bei jeder neuen Funktion gehört ein Test dazu.

## Versionen und Sicherheit

- Immer die **aktuellen stabilen Versionen** verwenden: Node.js aktuelle LTS (`.nvmrc`), npm aktuelle
  Hauptversion, alle Pakete aktuell. Vor dem Hinzufügen oder Aktualisieren mit `npm view <paket> version`
  prüfen.
- Versionen exakt pinnen (`.npmrc`: `save-exact`), danach die Versionstabelle in SPEC.md anpassen
  (ein Test vergleicht sie mit `package.json`).
- `npm audit` muss sauber sein. Keine Pakete mit bekannten Sicherheitslücken.
- `ignore-scripts=true` bleibt gesetzt. GitHub Actions nur mit Commit-Hash pinnen (Tag als Kommentar).
- Möglichst wenige Abhängigkeiten, möglichst wenig JavaScript im Browser.

## Ordnerstruktur

```
content/places.yaml              Ortsliste für die Karte
content/profile.jpg              Profilfoto (optional)
content/posts/<JJJJ-MM-TT-slug>/
  index.md                       Frontmatter (Titel, Datum, Ort, Fotos, Übersetzung)
  original.md                    Originaltext, byte-genau
  photos/                        Fotos dieses Beitrags
src/config.ts                    Name, Adresse, Reisedaten, Links
src/lib/                         testbare Logik
scripts/                         Build, Bilder, Prüfungen, Testserver
tests/unit, tests/e2e            Tests
public/                          Schriften, Icons, CNAME, robots.txt
```

## Beitragsformat

`content/posts/2026-11-23-hola-mexico/original.md`, der Text **genau so, wie der Autor ihn geschickt
hat** (keine Änderung, auch kein Zeilenende anpassen):

```text
Hoy llege a la Ciudad de Mexico. Es muy grande y hay mucho gente.

Das Essen ist der Wahnsinn, ich habe schon fünf Tacos gegessen.

Mañana voy a visitar el centro.
```

`content/posts/2026-11-23-hola-mexico/index.md`:

```yaml
---
title: '¡Hola, México!'            # Titel, wie der Autor ihn schreibt (nicht korrigieren)
titleDe: 'Hallo, Mexiko!'          # optional: Übersetzung des Titels
date: 2026-11-23                   # Datum des Beitrags (JJJJ-MM-TT)
place: ciudad-de-mexico            # id aus content/places.yaml (optional, siehe Kartenregeln)
photos:                            # optional, höchstens 20
  - file: 01.jpg                   # Datei in photos/
    alt: 'Blick über den Zócalo'   # Pflicht: deutscher Alt-Text, beschreibt das Bild
    caption: 'El Zócalo'           # optional: Bildunterschrift
videos:                            # optional, Videos liegen NIE im Repository
  - youtube: 'VIDEO_ID'
    title: 'Kurzer Titel'
translation:
  source_sha256: '<sha256 von original.md>'
  segments:                        # Reihenfolge wie im Original, lückenlos
    - lang: es
      text: |-
        Hoy llege a la Ciudad de Mexico. Es muy grande y hay mucho gente.
      de: |-
        Heute bin ich in Mexiko-Stadt angekommen. Sie ist riesig und es sind unglaublich viele Menschen unterwegs.
    - lang: de                     # eigenes Deutsch: nur text, wird 1:1 übernommen
      text: |-
        Das Essen ist der Wahnsinn, ich habe schon fünf Tacos gegessen.
    - lang: es
      text: |-
        Mañana voy a visitar el centro.
      de: |-
        Morgen schaue ich mir die Altstadt an.
---
```

Regeln für `segments`: Jedes `text` ist ein **wörtlicher Ausschnitt** aus `original.md`. Die
Ausschnitte kommen in derselben Reihenfolge vor, zwischen ihnen steht nur Leerraum. Eine Leerzeile
im Original wird ein neuer Absatz in der Übersetzung. Ein Absatz darf in mehrere Segmente geteilt
werden, wenn Spanisch und Deutsch darin wechseln. Der Build prüft das und den Hash.

Hash berechnen: `node scripts/hash-original.mjs content/posts/<ordner>/original.md`

## Ablauf: neuen Beitrag anlegen

1. **Branch** `post/<JJJJ-MM-TT-slug>` von aktuellem `main` anlegen.
2. **Ordner** `content/posts/<JJJJ-MM-TT-slug>/` anlegen (Datum des Beitrags, kurzer Slug ohne
   Sonderzeichen).
3. **Originaltext übernehmen:** Text des Autors unverändert in `original.md` schreiben, Zeichen für
   Zeichen. Nichts korrigieren, nicht glätten, keine Akzente ergänzen, keine Leerzeichen ändern.
4. **Sprachen erkennen und übersetzen:** spanische Passagen als `lang: es` mit natürlicher,
   sinngemäßer deutscher Übersetzung (`de`), deutsche Passagen als `lang: de` (nur `text`).
   Hash eintragen. Nur Deutsch? Dann nur `lang: de`-Segmente, die Übersetzungskachel entfällt.
5. **Titel:** vom Autor übernehmen. Hat er keinen, einen kurzen spanischen Titel vorschlagen und im
   Pull-Request nachfragen (`titleDe` optional).
6. **Fotos einbinden:** Dateien nach `photos/` (JPEG, PNG, WebP, HEIC), höchstens 20. Für jedes Foto
   einen beschreibenden deutschen Alt-Text. Prüfen, ob Menschen erkennbar sind (siehe Fotoregeln).
7. **Ort klären:** Ist der Ort aus Text oder Fotos **eindeutig** erkennbar? Wenn nicht: **den Autor
   fragen, wo er gerade ist. Nie raten.**
8. **Karte und Ortsliste aktualisieren:** Neuer Ort → am Ende von `content/places.yaml` eintragen
   (wird automatisch „Aquí estoy“). Bekannter Ort → nur `place:` im Beitrag setzen.
9. **Tests:** `npm test`. Screenshots von Startseite und Beitrag (Handy und Computer) ansehen.
10. **Pull-Request** öffnen: kurze Beschreibung, erkannte Sprachen, offene Fragen (Ort, Titel,
    Personen auf Fotos).

## Übersetzungsregeln

- Original **niemals** korrigieren, auch nicht in der Übersetzungskachel bei deutschen Passagen.
- Spanisch → gutes, natürliches Deutsch, sinngemäß (was der Autor meint), keine Wort-für-Wort-Übersetzung.
  Bei Fehlern im Spanisch die wahrscheinliche Absicht übersetzen. Ist sie unklar: nachfragen.
- Deutsche Passagen des Autors 1:1 übernehmen (Tippfehler bleiben).
- Reihenfolge wie im Original, keine farbliche Hervorhebung einzelner Passagen.
- Spanische Eigennamen bleiben (z. B. „Zócalo“), bekannte Orte dürfen deutsch heißen (Mexiko-Stadt).

## Fotoregeln

- Höchstens 20 Fotos pro Beitrag. Formate: JPG, PNG, WebP, HEIC.
- Das Bildskript (`scripts/images.mjs`) entfernt **alle** Metadaten (EXIF/GPS), dreht nach der
  Ausrichtung, verkleinert auf max. 1600 px, erzeugt Vorschaubilder (400/800 px) und prüft das
  Ergebnis. Bei GPS-Resten bricht der Build ab.
- Originale mit GPS landen trotzdem in der Git-Historie, deshalb den Autor bitten, Fotos auf dem
  Handy zu verkleinern und den Standort zu entfernen (README). Unbearbeitete Originale nur in `_originals/`.
- **Menschen:** Erkennbare Personen und Kinder nur zeigen, wenn der Autor ausdrücklich bestätigt,
  dass er ihr Einverständnis hat. Sind auf einem Foto Menschen, die er nicht als sich selbst benannt
  hat: nachfragen, bevor das Foto veröffentlicht wird.
- Keine Fotos, Texte oder Grafiken von Dritten ohne Erlaubnis des Autors.
- Videos nie ins Repository (Limit 100 MiB). YouTube-Video per `videos:` einbinden
  (Zwei-Klick, youtube-nocookie erst nach Klick).

## Kartenregeln

- Die Karte kennt **Orte**, nicht Beiträge. Quelle: `content/places.yaml`.
- Reihenfolge der Einträge = Reiseverlauf. Nummern zählen die Orte (1, 2, 3 …), nicht die Beiträge.
- Der **letzte** Eintrag ist der aktuelle Ort („Aquí estoy“).
- Ein neuer Ort wird **nur** eingetragen, wenn der Autor sagt, dass er dort war (oder es eindeutig
  aus Beitrag/Fotos hervorgeht). **Im Zweifel fragen, nie raten.**
- Eintrag: `id` (klein, mit Bindestrichen), `name` (spanischer Name), `lat`, `lon` (Dezimalgrad,
  Stadtzentrum genügt), `country` (`MX` oder `GT`), `arrived` (JJJJ-MM-TT), optional `region`
  (z. B. `Yucatán`, benennt den Kartenausschnitt).
- Ein Ort kann mehrere Beiträge haben und auf der Karte stehen, ohne dass es einen Beitrag gibt.
  Ein zweiter Besuch desselben Orts ist ein neuer Eintrag mit eigener `id` (z. B. `ciudad-de-mexico-2`).

## Datenschutz, noindex und Lizenz

- Jede Seite: `<meta name="robots" content="noindex, nofollow, noimageindex">`, `robots.txt` mit
  `Disallow: /` (auch Vorschauen).
- **Keine** Tracker, Analytics, Cookies, externen Schriften, Karten, Skripte oder CDNs. Alles selbst gehostet.
- Impressum und Datenschutz müssen zur tatsächlichen Technik passen. Bei neuer Technik anpassen.
- Rechte: alle vorbehalten (`LICENSE`). Copyright-Zeile im Fußbereich jeder Seite und in
  `<meta name="copyright">`. Name in `src/config.ts`, muss zu LICENSE und Impressum passen.
- Schriften bleiben unter SIL OFL, ihre Lizenztexte liegen in `public/fonts/` und werden ausgeliefert.
- `THIRD-PARTY-NOTICES.md` nach jeder Abhängigkeitsänderung neu erzeugen (`npm run notices`).
  Starkes Copyleft (GPL, AGPL) dem Autor melden.

## Tests

```bash
npm test                 # alles: lint, unit, build, e2e
npm run lint             # Prettier + .gitignore-Prüfung
npm run test:unit        # Vitest
npm run build:e2e        # baut dist/ und dist-preview/ (Unterpfad /pr-preview/pr-1/)
npm run test:e2e         # Playwright (Projekte siehe playwright.config.ts)
```

Lokal mit vorinstalliertem Chromium (andere Playwright-Version):
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`.

## Deployment

Wird in PR 9 eingerichtet (GitHub Actions → Branch `gh-pages`, Vorschauen unter `/pr-preview/pr-NN/`).

## NIE tun

- Das Spanisch (oder Deutsch) des Autors korrigieren, glätten oder „verbessern“.
- Originalfotos mit GPS-/EXIF-Daten veröffentlichen oder unbearbeitete Originale einchecken.
- Externe Dienste, Tracker, Analytics, Cookies, CDNs oder Google Fonts einbinden.
- Eine Open-Source- oder Creative-Commons-Lizenz für die Inhalte oder den Code hinzufügen.
- Einen Ort auf der Karte raten.
- Fotos mit erkennbaren fremden Personen oder Kindern ohne bestätigtes Einverständnis veröffentlichen.
- Videos oder Dateien über 100 MiB ins Repository legen.
- Direkt auf `main` pushen, Tests abschalten oder überspringen, um grün zu werden.
- Veraltete oder unsichere Versionen von Node, npm oder Paketen verwenden.
