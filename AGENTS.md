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
3. Lokal nur so viel testen, wie die Änderung verlangt (Tabelle unten), Aussehen per Screenshot
   prüfen (Computer **und** Handy). Den vollen Lauf aller Tests und Browser macht die CI im
   Pull-Request.
4. Pull-Request öffnen. Der Autor merged selbst, **immer per „Squash and merge“**.
5. Baut ein Pull-Request auf einem anderen, noch offenen auf: nach dessen Squash-Merge den Branch auf
   den neuen `main` rebasen (`git rebase --onto origin/main <alter-basis-commit>`) und mit
   `--force-with-lease` pushen (nur eigene Feature-Branches).
6. Bei jeder neuen Funktion gehört ein Test dazu.
7. Läuft `main` weiter, während ein Pull-Request offen ist (z. B. weil der Autor einen anderen PR merged),
   verlangt GitHub vor dem Merge einen aktuellen Branch („Require branches to be up to date“). Dann
   `git fetch origin main && git rebase origin/main`, Tests prüfen und mit `--force-with-lease`
   pushen (nur eigene Feature-Branches). Die CI läuft danach neu. Der Autor kann stattdessen auch
   „Update branch“ in GitHub tippen.

### Wie viel lokal testen?

Die CI (`ci.yml`) wählt ihren Umfang selbst nach den geänderten Dateien (`scripts/ci-scope.mjs`):
nur Dokumente im Hauptordner → Lint und Unit-Tests; nur `content/` → zusätzlich Build und Chromium;
alles andere → voller Lauf mit allen Browsern. Ohne grüne CI lässt sich nicht mergen.
Der volle lokale Lauf ist nur eine zweite Absicherung und kostet Zeit. Darum nach Art der Änderung:

| Änderung                                    | Lokal                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Nur Dokumente (SPEC, TODO, README, AGENTS)  | `npm run lint`; bei SPEC-Änderungen zusätzlich `npm run test:unit` (SPEC-Abgleich)     |
| Beitrag, noch in Überarbeitung              | nichts; nicht nach jeder Chatnachricht testen, bauen oder pushen                       |
| Beitrag fertig (Autor sagt „fertig“)        | `npm run test:unit`, einmal bauen, je ein Screenshot Handy und Computer, dann PR       |
| Code, Layout, Karte, Skripte                | `npm run lint`, `npm run test:unit`, `npm run test:e2e:local` (nur Chromium)           |
| Abhängigkeiten, Build, Service Worker, Test | voller Lauf `npm test`                                                                 |

- Bei einem Beitrag in Überarbeitung Änderungen sammeln und erst committen und pushen, wenn der
  Autor „fertig“ sagt. Das spart CI-Läufe.
- Wird die CI rot, den Log holen und gezielt beheben, statt auf Verdacht lokal alles zu wiederholen.
- Die Sicherheit bleibt: Branch-Schutz, „Require branches to be up to date“ und der rote Deploy
  bleiben unverändert.

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
  photos/                        Fotos dieses Beitrags (vom Import verkleinert, ohne GPS)
  clips/                         eigene Videos: NN.mp4 + NN.jpg (Standbild), vom Import erzeugt
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
clips:                             # optional, höchstens 20: eigene Videos (Standard für Handyclips)
  - file: 01.mp4                   # Datei in clips/ (der Import erzeugt sie samt Standbild 01.jpg)
    title: 'Mariachis auf der Plaza'  # Pflicht: deutsche Beschreibung (Bildunterschrift und Alt-Text)
    width: 1280                    # width, height, duration trägt der Import ein (Vorschlag
    height: 720                    # wird vom Skript gedruckt), nicht von Hand ändern
    duration: 12.4
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

1. **Branch** `post/<JJJJ-MM-TT-slug>` von aktuellem `main` anlegen. Gibt es noch den Beispielbeitrag
   `content/posts/2026-11-23-entrada-de-ejemplo/`, diesen beim ersten echten Beitrag löschen.
2. **Ordner** `content/posts/<JJJJ-MM-TT-slug>/` anlegen (Datum des Beitrags, kurzer Slug ohne
   Sonderzeichen).
3. **Originaltext übernehmen:** Text des Autors unverändert in `original.md` schreiben, Zeichen für
   Zeichen. Nichts korrigieren, nicht glätten, keine Akzente ergänzen, keine Leerzeichen ändern.
4. **Sprachen erkennen und übersetzen:** spanische Passagen als `lang: es` mit natürlicher,
   sinngemäßer deutscher Übersetzung (`de`), deutsche Passagen als `lang: de` (nur `text`).
   Hash eintragen. Nur Deutsch? Dann nur `lang: de`-Segmente, die Übersetzungskachel entfällt.
5. **Titel:** vom Autor übernehmen. Hat er keinen, einen kurzen spanischen Titel vorschlagen und im
   Pull-Request nachfragen (`titleDe` optional).
6. **Fotos und Videos importieren:** Die Handy-Originale (Google Drive, Link oder Anhang; Quelle
   siehe „Medien holen“ unten) in einen Ordner **außerhalb von `content/`** legen (z. B. im
   Scratchpad oder `_originals/`) und dann
   `node scripts/import-media.mjs <quellordner> <JJJJ-MM-TT-slug>` ausführen. Das Skript verkleinert
   und entfernt GPS/Metadaten, schreibt `photos/NN.jpg` bzw. `clips/NN.mp4` + `NN.jpg` und druckt
   einen Frontmatter-Vorschlag. **Originale nie einchecken, nie ohne den Import in `photos/` oder
   `clips/` legen.** Dann `photos:` und `clips:` in `index.md` eintragen: für jedes Foto ein
   beschreibender deutscher `alt`, für jedes Video ein kurzer deutscher `title` (Fotos und Videos
   ansehen: Standbild `clips/NN.jpg`). **Jedes** Foto und Video, das der Autor schickt, wird
   übernommen (Videos mit Ton, nicht stumm). Zu lange Videos (über 180 s) meldet das Skript; dann dem
   Autor sagen, dass er es kürzen soll. Braucht ffmpeg
   (`sudo apt-get install -y ffmpeg`, falls es fehlt).
7. **Ort klären:** Ist der Ort aus Text oder Fotos **eindeutig** erkennbar? Wenn nicht: **den Autor
   fragen, wo er gerade ist. Nie raten.**
8. **Karte und Ortsliste aktualisieren:** Neuer Ort → am Ende von `content/places.yaml` eintragen
   (wird automatisch „Aquí estoy“). Bekannter Ort → nur `place:` im Beitrag setzen.
9. **Tests:** `npm test`. Screenshots von Startseite und Beitrag (Handy und Computer) ansehen.
10. **Pull-Request** öffnen: kurze Beschreibung, erkannte Sprachen, offene Fragen (Ort, Titel).

## Übersetzungsregeln

- Original **niemals** korrigieren, auch nicht in der Übersetzungskachel bei deutschen Passagen.
- Spanisch → gutes, natürliches Deutsch, sinngemäß (was der Autor meint), keine Wort-für-Wort-Übersetzung.
  Bei Fehlern im Spanisch die wahrscheinliche Absicht übersetzen. Ist sie unklar: nachfragen.
- Deutsche Passagen des Autors 1:1 übernehmen (Tippfehler bleiben).
- Reihenfolge wie im Original, keine farbliche Hervorhebung einzelner Passagen.
- Spanische Eigennamen bleiben (z. B. „Zócalo“), bekannte Orte dürfen deutsch heißen (Mexiko-Stadt).

## Fotoregeln

- Höchstens 20 Fotos und 20 Videos (`clips`) pro Beitrag. Eingangsformate: JPG, PNG, WebP, HEIC.
- Der **Import** (`scripts/import-media.mjs`) macht aus jedem Foto ein JPEG mit höchstens 1600 px und
  ohne Metadaten (EXIF/GPS). Das Bildskript (`scripts/images.mjs`) erzeugt beim Build die
  Vorschaubilder (400/800 px) und prüft das Ergebnis. Bei GPS-Resten bricht der Build ab.
- Weil erst der Import verkleinert und GPS entfernt, landen **nie** Originale mit GPS in der
  Git-Historie. Unbearbeitete Originale gehören nicht ins Repository (höchstens lokal in `_originals/`).
- **Menschen:** Jedes Foto, das der Autor gibt, wird ohne Rückfrage übernommen. Nicht prüfen, ob
  Personen oder Kinder darauf zu sehen sind, und nicht nach deren Einverständnis fragen. Die
  Verantwortung dafür liegt allein beim Autor.
- Keine Fotos, Texte oder Grafiken von Dritten ohne Erlaubnis des Autors.
- **Videos:** Eigene Videos kommen als `clips:` ins Repository, aber **nur nach dem Import** (720p,
  H.264/AAC, mit Ton, ohne Standort, höchstens 180 s und 40 MiB je Clip). Die Seite liefert sie
  selbst aus und lädt sie erst nach dem Antippen von „Play“. YouTube wird nicht verwendet (der
  Autor will seine Videos selbst über Google Drive liefern); `videos:` im Frontmatter ist ein Fehler.
- **Platz:** GitHub Pages erlaubt 1 GB. Der Build warnt ab 700 MiB und bricht ab 900 MiB ab. Bei der
  Warnung dem Autor Bescheid geben (Optionen: weniger oder kürzere Clips, Videos in ein zweites
  Pages-Repository auslagern).

## Medien holen (Quelle der Originale)

Die Originale kommen vom Autor, nicht aus dem Repository. In dieser Reihenfolge versuchen:

1. **Anhänge im Chat** (liegen schon im Arbeitsordner).
2. **Google-Drive-Konnektor:** der Autor legt die Dateien in einen Drive-Ordner, ein Unterordner je
   Beitrag, benannt wie der Beitrags-Slug (`Reise-Inbox/2026-11-25-teotihuacan/`). Nur diesen
   Unterordner herunterladen. Ist der Konnektor nicht verbunden oder liefert er keine Binärdateien,
   weiter mit 3.
3. **Geteilter Ordner-Link** („Jeder mit dem Link“): herunterladen, wenn die Netzwerkfreigabe der
   Umgebung `drive.google.com` und `drive.usercontent.google.com` erlaubt (sonst `read_documentation`
   mit Thema `environment.network` und den Autor um die Freigabe bitten).

Heruntergeladene Dateien immer in einen neuen, leeren Ordner außerhalb von `content/` legen und
nach dem Import nicht einchecken. Wichtig: Bei Android-„Bewegten Fotos“ (JPEG mit eingebettetem
Video) wird nur das Standbild übernommen.

## Kartenregeln

- Die Karte kennt **Orte**, nicht Beiträge. Quelle: `content/places.yaml`.
- Reihenfolge der Einträge = Reiseverlauf. Nummern zählen die Orte (1, 2, 3 …), nicht die Beiträge.
- Der **letzte** Eintrag ist der aktuelle Ort („Aquí estoy“).
- Ein neuer Ort wird **nur** eingetragen, wenn der Autor sagt, dass er dort war (oder es eindeutig
  aus Beitrag/Fotos hervorgeht). **Im Zweifel fragen, nie raten.**
- Eintrag: `id` (klein, mit Bindestrichen), `name` (spanischer Name), `lat`, `lon` (Dezimalgrad,
  Stadtzentrum genügt), `country` (`MX` oder `GT`), `arrived` (JJJJ-MM-TT), optional `region`
  (z. B. `Yucatán`, `Chiapas`; benennt den Kartenausschnitt). Liegen mehrere Orte nahe beieinander,
  bei allen dieselbe `region` setzen, sonst heißt der Ausschnitt nach dem Land.
- Nach dem Eintragen Startseite am Handy (390px) und Computer per Screenshot prüfen: Marker,
  Pillen, Ausschnitte und das Schild „Aquí estoy“ dürfen sich nicht unschön überdecken.
- Ein Ort kann mehrere Beiträge haben und auf der Karte stehen, ohne dass es einen Beitrag gibt.
  Ein zweiter Besuch desselben Orts ist ein neuer Eintrag mit eigener `id` (z. B. `ciudad-de-mexico-2`).

## Datenschutz, noindex und Lizenz

- Jede Seite: `<meta name="robots" content="noindex, nofollow, noimageindex">`, `robots.txt` mit
  `Disallow: /`.
- **Keine** Tracker, Analytics, Cookies, externen Schriften, Karten, Skripte oder CDNs. Alles selbst gehostet.
- Impressum und Datenschutz müssen zur tatsächlichen Technik passen. Bei neuer Technik anpassen.
- Rechte: alle vorbehalten (`LICENSE`). Copyright-Zeile im Fußbereich jeder Seite und in
  `<meta name="copyright">`. Name in `src/config.ts`, muss zu LICENSE und Impressum passen.
- Schriften bleiben unter SIL OFL, ihre Lizenztexte liegen in `public/fonts/` und werden ausgeliefert.
- `THIRD-PARTY-NOTICES.md` nach jeder Abhängigkeitsänderung neu erzeugen (`npm run notices`).
  Starkes Copyleft (GPL, AGPL) dem Autor melden (die Prüfung bricht dann ab).
- Neue externe Links nur nach Rücksprache; sie müssen in `ALLOWED_EXTERNAL` in `scripts/check-dist.mjs`
  stehen, sonst bricht der Build ab. Datenschutzerklärung dann anpassen.
- Name, Anschrift und E-Mail stehen nur in `src/config.ts`; die Copyright-Zeile in `LICENSE` muss dazu
  passen (Test prüft Gleichheit). Bei Änderungen beide anpassen.

## Tests

```bash
npm test                 # alles: lint, unit, build, e2e
npm run format           # Prettier anwenden (VOR den Tests ausführen)
npm run lint             # Prettier-Prüfung + .gitignore-Prüfung
npm run images           # nur Bildskript (Fotos verarbeiten und prüfen)
node scripts/import-media.mjs <quellordner> <slug>   # Handy-Originale verkleinern, GPS entfernen
npm run test:unit        # Vitest
npm run build:e2e        # baut dist/ (echte Inhalte) und dist-preview/ (Testinhalte aus
                         # tests/fixtures/content unter /pr-preview/pr-1/)
npm run test:e2e         # Playwright: Chromium, Firefox, WebKit, Pixel 7, iPhone 15 (wie im PR)
npm run test:e2e:local   # nur Chromium (schnell)
npm run test:e2e:nightly # zusätzlich Edge, Chrome, iPad, Galaxy
npm run check:external   # externe Links erreichbar (Palabrita)
npm run notices          # THIRD-PARTY-NOTICES.md neu erzeugen
```

Browser einmalig installieren: `npx playwright install --with-deps chromium firefox webkit`.
Manuelle Gerätetests: [MANUAL-TESTS.md](MANUAL-TESTS.md).

**Cloud-Sitzungen (Claude Code):** Die Umgebung „Reisetagebuch Claude Environment“ hat ein Startskript,
das Node 26 (LTS) nach `/opt/node26` installiert und über `/root/.local/bin` vor das vorinstallierte
Node 22 stellt, npm 12 installiert, `npm ci` ausführt und die Playwright-Browser Chromium, Firefox und
WebKit (mit Systembibliotheken) nach `/opt/pw-browsers` lädt. Danach laufen alle Befehle ohne
Sonderpfade. Prüfen mit `node -v` (v26.x). Ändert sich die Node-Hauptversion, das Startskript in den
Umgebungseinstellungen anpassen (`NODE_MAJOR`).

## PWA

Icons nur über `node scripts/make-icons.mjs` ändern (eigenes Motiv, keine fremden Grafiken). Der
Service Worker wird beim Build erzeugt; neue Dateiarten im Zweifel network-first lassen.

## Deployment

- Pages-Quelle ist **„GitHub Actions“**. Jeder Merge in `main` startet `.github/workflows/deploy.yml`:
  Build → Veröffentlichung (die Tests laufen nur im Pull-Request; der Branch muss vor dem Merge
  aktuell sein, Ruleset „Require branches to be up to date“). Rot = nichts wird veröffentlicht.
- Pull-Requests: `ci.yml` testet (keine Artefakte, keine Vorschau-Seiten unter `/pr-preview/`). Das
  Aussehen prüft der Agent per Screenshot vor dem PR.
- Nach dem Merge eines neuen Beitrags prüfen, dass der Deploy-Lauf grün ist.

## NIE tun

- Das Spanisch (oder Deutsch) des Autors korrigieren, glätten oder „verbessern“.
- Originalfotos mit GPS-/EXIF-Daten veröffentlichen oder unbearbeitete Originale einchecken.
- Externe Dienste, Tracker, Analytics, Cookies, CDNs oder Google Fonts einbinden.
- Eine Open-Source- oder Creative-Commons-Lizenz für die Inhalte oder den Code hinzufügen.
- Einen Ort auf der Karte raten.
- Fotos des Autors ablehnen, zurückhalten oder wegen abgebildeter Personen nachfragen (Personen und
  Einverständnis werden nicht geprüft).
- Videos oder Dateien über 100 MiB ins Repository legen, oder Videos ohne den Import (`scripts/import-media.mjs`).
- Direkt auf `main` pushen, Tests abschalten oder überspringen, um grün zu werden.
- PR-Artefakte (Screenshots, gebaute Seite als ZIP) wieder einführen: Der Autor kann sie am Handy
  nicht öffnen (bewusst entfernt). Ebenso die Tests in `deploy.yml` wieder aufnehmen: Sie laufen nur
  im PR, die Regel „Branch muss aktuell sein“ im Ruleset macht das sicher. Wird diese Regel je
  abgeschaltet, müssen die Tests im Deploy zurück.
- Veraltete oder unsichere Versionen von Node, npm oder Paketen verwenden.
