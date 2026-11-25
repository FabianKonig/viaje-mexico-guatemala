# Spezifikation: „Un viaje a México y Guatemala“

Stand: wird bei **jeder** Änderung am Code mitgepflegt. Spezifikation und Code müssen immer
übereinstimmen. Wo sich das maschinell prüfen lässt (Versionen, Farben, Texte, Pfade), prüfen es
Tests (`tests/unit/spec-sync.test.ts`).

## 1. Ziel

Öffentlicher, zweisprachiger Reiseblog als statische Seite. Der Autor reist vom **23. November 2026
bis 3. Februar 2027** durch Mexiko und Guatemala und schreibt unregelmäßig Beiträge auf Spanisch
(Anfängerniveau, teils mit eigenem Deutsch gemischt) mit Fotos. Leser sind vor allem Familie und
Freunde, viele davon wenig technikaffin. Der Link wird in einer WhatsApp-Gruppe geteilt, es gibt
keine Kommentare.

- Adresse: <https://viaje.fabiankonig.de> (GitHub Pages, eigene Subdomain, HTTPS erzwungen)
- Oberfläche: Deutsch mit spanischen Elementen („Entradas“, „Aquí estoy“, „Ruta“)
- Nicht in Suchmaschinen, keine Tracker, keine Cookies, keine Drittanbieter-Anfragen
- Alle Rechte vorbehalten (keine Open-Source-Lizenz)

## 2. Technik und Entscheidungen

| Entscheidung | Begründung |
| --- | --- |
| **Astro** (statisch, `output: 'static'`), nur `.astro`-Komponenten, kein UI-Framework | Erzeugt reines HTML/CSS, JavaScript nur wo nötig; Markdown/YAML gut handhabbar |
| Eigener Beitrags-Loader (`src/lib/posts.ts`) statt Astro Content Collections | Volle Kontrolle über Originaltreue (Byte-Gleichheit), mit Vitest direkt testbar |
| Bilder: eigenes Skript mit **sharp**, HEIC über **heic-convert** | Metadaten sicher entfernen, Größen erzeugen, GPS-Prüfung, keine Cloud-Dienste |
| Tests: **Vitest** (Unit), **Playwright** (Browser), **axe-core** (Barrierefreiheit) | Standardwerkzeuge, laufen lokal und in GitHub Actions |
| Formatierung: **Prettier** | Ein Werkzeug, wenig Abhängigkeiten |
| Kein CSS-Framework, keine Icon-Bibliothek | Wenig Abhängigkeiten, eigene SVGs (Urheberrecht) |
| Statischer Testserver `scripts/serve.mjs` ohne Abhängigkeiten | Verhält sich wie GitHub Pages (404.html, Ordner-Weiterleitung, Unterpfade) |
| `compressHTML: false` | Leerzeichen und Zeilenumbrüche des Originaltexts bleiben erhalten |
| Merges nur per **Squash** | Eine saubere Commit-Zeile pro Pull-Request auf `main` |

### 2.1 Versionen (immer aktuell und ohne bekannte Sicherheitslücken)

Grundsatz: Es werden die jeweils **aktuellen stabilen Versionen** verwendet. Node.js ist die aktuelle
**LTS-Version**. Abhängigkeiten werden exakt gepinnt (`save-exact`), `npm audit` muss ohne
Befund (Schwelle „moderate“) durchlaufen, Dependabot schlägt wöchentlich Updates vor. GitHub
Actions sind auf Commit-Hashes gepinnt. Installationsskripte von Paketen sind abgeschaltet
(`ignore-scripts=true` in `.npmrc`).

Diese Tabelle wird von einem Test mit `package.json` und `.nvmrc` abgeglichen:

<!-- versions:start -->
| Werkzeug | Version |
| --- | --- |
| node | 26 (LTS) |
| npm | 12 |
| astro | 7.4.13 |
| vitest | 5.1.1 |
| @playwright/test | 1.65.1 |
| @axe-core/playwright | 4.14.0 |
| prettier | 3.10.1 |
| prettier-plugin-astro | 1.1.2 |
| yaml | 2.9.1 |
| sharp | 0.35.5 |
| heic-convert | 2.1.0 |
| html-validate | 11.21.1 |
<!-- versions:end -->

## 3. Ordnerstruktur

```
content/
  places.yaml                 Ortsliste (Karte), Reihenfolge = Reiseverlauf
  profile.jpg                 (optional) Profilfoto, sonst Platzhalter
  posts/
    2026-11-23-hola-mexico/   ein Beitrag = ein Ordner
      index.md                Frontmatter (Titel, Datum, Ort, Fotos, Übersetzung)
      original.md             Originaltext, byte-genau wie geschrieben
      photos/                 Fotos des Beitrags (bis 20), vom Import verkleinert (JPEG, max. 1600 px)
      clips/                  eigene Videos: NN.mp4 (720p, mit Ton) und NN.jpg (Standbild), bis 20
public/                       statische Dateien (Schriften, Icons, CNAME, robots.txt)
public/media/                 vom Bildskript erzeugt (nicht eingecheckt)
scripts/                      Build, Bildskript, Prüfungen, Lizenzhinweise, Testserver
src/
  config.ts                   zentrale Einstellungen (Name, Adresse, Reisedaten)
  lib/                        testbare Logik (Pfade, Beiträge, Reisetag, Karte)
  layouts/, components/, pages/, styles/
tests/
  unit/                       Vitest
  e2e/                        Playwright
  fixtures/                   Testinhalte (Grenzfälle) für die Vorschau-Variante
```

## 4. Build-Varianten und Umgebungsvariablen

| Variable | Bedeutung | Standard |
| --- | --- | --- |
| `SITE_URL` | öffentliche Adresse, für absolute Open-Graph-URLs | `https://viaje.fabiankonig.de` |
| `BASE_PATH` | Basispfad, z. B. `/pr-preview/pr-1/` (Test-Variante) | `/` |
| `OUT_DIR` | Ausgabeordner | `dist` |
| `CONTENT_DIR` | Inhaltsordner | `content` |
| `PREVIEW` | `true` = Vorschau (kein Service Worker) | aus |

Alle internen Links und Ressourcen werden über den Basispfad gebildet (`src/lib/paths.ts`). Die
Seite funktioniert unverändert unter `/` und unter Unterpfaden (getestet mit `/pr-preview/pr-1/`).
Veröffentlicht wird nur unter `/` (siehe Abschnitt 8).

## 5. Umsetzungsstand

| Bereich | Pull-Request | Stand |
| --- | --- | --- |
| Grundgerüst, Dokumente, Test- und CI-Gerüst | 1 | umgesetzt |
| Design und Startseite | 2 | umgesetzt (Karte und Reisetag folgen) |
| Datenmodell, Beitrags-Parser | 2 | umgesetzt |
| Beitragsseite, Zweisprachigkeit | 3 | umgesetzt (Fotogalerie folgt in PR 4) |
| Fotos, Lightbox, Bildskript, Videos | 4 | umgesetzt |
| Routenkarte, Ortsliste | 5 | umgesetzt |
| Reisetag-Anzeige | 6 | umgesetzt |
| PWA | 7 | umgesetzt |
| Impressum, Datenschutz, noindex, Lizenzhinweise | 8 | umgesetzt |
| Deployment (GitHub Actions) | 9 | umgesetzt |
| Cross-Browser-Tests, manuelle Checkliste | 10 | umgesetzt |

Alle Bereiche sind umgesetzt. Neue Funktionen werden hier ergänzt und im selben Pull-Request
beschrieben, getestet und dokumentiert.

## 6. Datenmodell

### 6.1 Beiträge

Ein Beitrag ist ein Ordner `content/posts/JJJJ-MM-TT-slug/` mit `index.md` (nur Frontmatter),
`original.md` (Originaltext) und optional `photos/`. Format und Beispiel: [AGENTS.md › Beitragsformat](AGENTS.md#beitragsformat).

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `title` | ja | Titel wie vom Autor geschrieben |
| `titleDe` | nein | deutsche Übersetzung des Titels |
| `date` | ja | `JJJJ-MM-TT` |
| `place` | nein | `id` aus `places.yaml`; fehlt der Ort, zeigt der Beitrag nur den Tag |
| `cover` | nein | Titelbild: `file` eines Fotos aus `photos` (Beitragskarte, Vorschau, WhatsApp-Bild). Fehlt es, gilt das erste Foto. Die Reihenfolge der Fotos bleibt chronologisch, das Titelbild muss nicht das erste sein |
| `coverGenerated` | nein | selbst gezeichnetes Titelbild: Dateiname (`.jpg`/`.png`/`.webp`) direkt im Beitragsordner, erzeugt mit `scripts/make-cover.mjs` (flache SVG-Zeichnung, als Quelle `cover.svg` im Beitragsordner eingecheckt und nie veröffentlicht → `cover.jpg`, 1600×1200, reproduzierbar: gleiche SVG, gleiches Bild). Nur als Vorschau (Beitragskarte, WhatsApp-Bild), **nicht** in `photos` und nicht in der Medienliste; ersetzt das Foto-Titelbild. Schließt `cover` aus (Build-Fehler). Alt-Text „Titelbild“ |
| `photos[]` | nein | `file` (in `photos/`), `alt` (Pflicht; Standard `Foto N von M`, siehe 7.6), `caption` (optional), `motion` (optional: stumme Schleife eines Bewegtfotos, `.mp4` in `photos/`); höchstens 30 |
| `clips[]` | nein | eigenes Video: `file` (`.mp4` in `clips/`, dazu `clips/<name>.jpg` als Standbild), `title` (Pflicht; Standard `Video N`), `width`, `height`, `duration` (trägt der Import ein); höchstens 10 |
| `translation.source_sha256` | ja | SHA-256 von `original.md` |
| `translation.segments[]` | ja | `lang` (`es`/`de`), `text` (wörtlicher Ausschnitt), `de` (nur bei `es`) |

Regeln (geprüft in `src/lib/content.ts` und `src/lib/translation.ts`, Build bricht bei Fehlern ab):

- Ordnername `JJJJ-MM-TT-slug` (Kleinbuchstaben, Ziffern, Bindestriche).
- `original.md` wird byte-genau übernommen. Der Hash muss stimmen.
- Die Segmente decken das Original lückenlos und in Reihenfolge ab, dazwischen nur Leerraum.
- Leerzeile im Original = neuer Absatz in der Übersetzung. Zeilenumbrüche und Leerraum zwischen
  Segmenten innerhalb eines Absatzes bleiben erhalten.
- Gibt es kein `es`-Segment, entfällt die Übersetzungskachel und der Schalter.
- Sortierung: neueste zuerst (Datum, dann Ordnername absteigend).

### 6.2 Ortsliste `content/places.yaml`

Liste in Reihenfolge der Reise. Felder: `id`, `name` (spanisch), `lat`, `lon`, `country` (`MX`/`GT`),
`arrived` (`JJJJ-MM-TT`, nicht vor dem vorherigen Ort), optional `region`. Nummer = Position in der
Liste, der letzte Eintrag ist der aktuelle Ort. Zu Beginn nur „Ciudad de México“.

### 6.3 Spanisch-Lernhilfe (außerhalb der Seite)

Zu jedem Beitrag mit spanischen Passagen legt der Agent in Google Drive eine Lern-Datei an: ein Google
Doc `Lernhilfe-<ordner>` im Drive-Unterordner des Beitrags (korrigierte Fassung, Fehler mit Erklärung,
Stilvorschläge, Grammatik) und pflegt das Sammel-Doc `Lernhilfe-Übersicht` im Hauptordner (Fehler je
Kategorie und Beitrag, Wiederholungsfehler). Sie gehört nicht ins Repository, nicht auf die Seite und
verändert `original.md` nicht. Rein deutsche Beiträge bekommen keine. `¿` und `¡` am Anfang werden in der korrigierten Fassung still gesetzt (nicht markiert) und sonst nie erwähnt, gezählt oder erklärt (Wunsch des Autors). Einzelheiten, Kategorien und
Die Lern-Datei liegt im selben Drive-Ordner wie die Medien; Dateien mit Präfix `Lernhilfe-` (und
`tmp-`) sind nie Medien oder Beitragstext und werden bei Änderungen am Beitrag ignoriert. Wird der Text
eines bestehenden Beitrags geändert, werden Lern-Datei und Übersicht neu aufgebaut (Zählung ersetzt,
nicht addiert); bei geänderten Medien bleibt die Lern-Datei unverändert. Ablauf:
[AGENTS.md › Bestehenden Beitrag ändern](AGENTS.md#bestehenden-beitrag-ändern-medien-oder-text). Regeln: [AGENTS.md › Spanisch-Lernhilfe](AGENTS.md#spanisch-lernhilfe-lern-datei-in-google-drive).


## 7. Design

### 7.1 Farben (Kontrast mindestens 4,5:1 für normalen Text)

<!-- colors:start -->
| Name | Wert | Verwendung |
| --- | --- | --- |
| sand | #F6EBD9 | Seitenhintergrund |
| card | #FFF9EF | Karten, Fußbereich |
| ink | #2B1D16 | Text, Rahmen, Schatten |
| terracotta | #C4552D | Flächen, Route |
| terracotta-text | #A8421F | Text in Terrakotta (5,1:1 auf Sand) |
| turquoise | #0E7C86 | Flächen |
| turquoise-dark | #0B5D66 | Links, Knöpfe, Meer (7,2:1 mit Kartenfarbe) |
| marigold | #F2A900 | gelber Kasten, Palabrita-Kachel (Text in ink, 8,1:1) |
| pink | #D4457A | Akzent, Halo, Flächen ohne Text |
| pink-text | #B33563 | Pink mit Text darauf/darin (5,6:1 mit Kartenfarbe) |
| land-other | #E6D6BD | Nachbarländer in der Karte |
<!-- colors:end -->

Pink #D4457A erreicht mit Text nur 3,6–4,1:1, deshalb gibt es für Beschriftungen den dunkleren Ton `pink-text`.

### 7.2 Formen und Schrift

- Karten und Fotorahmen: 2px Rahmen in `ink`, harter Schatten `6px 6px 0 #2B1D16`, keine weichen
  Schatten, keine Farbverläufe, Radius 14px.
- Schriften selbst gehostet in `public/fonts/` (WOFF2, variable Achse `wght`, Teilmengen latin und
  latin-ext, `font-display: swap`): **Fraunces** für Überschriften, **DM Sans** für Text. Lizenz SIL OFL 1.1.
- Grundschrift 17px, Zeilenhöhe 1,6.
- **Drei Schriftgrößen, hierarchisch** (CSS-Variablen in `global.css`): `--fs-heading` Überschrift der Seite
  (Seitentitel im Kopf, 32–52px), `--fs-title` Titel (24–36px: Beitragstitel, Kartentitel und „Entradas“
  auf der Startseite), `--fs-text` alles Übrige (17px: Fließtext, Begrüßung, Original und Übersetzung,
  Kachel- und Abschnittsüberschriften wie „Original“, „Fotos“ und im gelben Kasten in Fraunces fett,
  Beschriftungen, Karten-Legende, Schalter, Fußbereich). Der Titel ist immer kleiner als die
  Überschrift und größer als der Text; ein E2E-Test prüft das auf Start- und Beitragsseite. Die
  Rechtstexte (Prose) haben eigene Größen.
- Fokus: 3px Umriss in `turquoise-dark`. Touch-Ziele mindestens 44px. `prefers-reduced-motion` schaltet
  Bewegungen ab.

### 7.3 Alle Seiten

1. **Papel-Picado-Wimpelrand** ganz oben: eigenes SVG-Muster, Fähnchen in Pink, Marigold, Türkis und
   Terrakotta mit kleinen Löchern, an einer Schnur, über die volle Breite (dekorativ, `aria-hidden`).
2. **Kopfzeile:** links der Titel „Un viaje a México y Guatemala“ (Fraunces, `clamp(32px, 5.5vw, 52px)`,
   Link zur Startseite; auf der Startseite `h1`, sonst `p`). Ganz rechts oben das runde Profilbild
   (Startseite 76px, sonst 44px, Rahmen und harter Schatten). Das Bild bleibt in jeder Breite rechts
   oben (Flexbox ohne Umbruch, der Titel bricht stattdessen um). Auf sehr breiten Bildschirmen
   (über 1200px Inhaltsbreite) sitzt es rechts oben im Inhaltsbereich, bündig mit den Inhalten darunter. Platzhalter bis zum echten Foto:
   `public/profile-placeholder.svg` (Türkis mit Silhouette).
   Darunter die Navigation „Ruta“ (→ `#ruta`) und „Beiträge“ (→ `#entradas`).
3. **Fußbereich:** WhatsApp-Hinweis („Gefällt dir ein Beitrag? Reagiere in der WhatsApp-Gruppe. Dort
   verlinke ich jeden neuen Eintrag.“), Copyright-Zeile `© 2026–2027 Fabian König. Alle Rechte
   vorbehalten.`, Links zu Impressum, Datenschutz, Lizenzhinweise (PR 8). Kein Link „Über das Projekt“.
4. Sprunglink „Zum Inhalt springen“ für Tastaturnutzer.

### 7.4 Startseite

- **Titelbereich** ohne Überschrift und ohne Titelfoto. Ab 900px schwimmt die Routenkarte rechts
  (`float: right`, 7 von 12 Teilen, 40px Abstand, oben bündig mit dem gelben Kasten). Der Text
  umfließt sie: Zeilen neben der Karte bleiben links, Zeilen unterhalb der Karte laufen über die
  volle Breite (kein Weißraum neben langem Text). Links der gelbe Kasten mit dem Text ¡Bienvenido / Willkommen! (Marigold, Rahmen, Schatten),
  darunter der Begrüßungstext („¡Hola! Schön, dass du hier bist. Dies ist
  mein Versuch eines Reiseblogs. Und zugleich ein Versuch, mein Spanisch durch Schreiben zu festigen. Mit
  Beiträgen mal auf Spanisch (und inklusive aller Anfängerfehler), aber auch mal auf Deutsch, je nach Lust und
  Laune. Und keine Sorge, falls tú no hablas español: Die deutsche Übersetzung steht immer daneben.“,
  dann in eigenem Absatz „Ich möchte hier festhalten, was ich unterwegs erlebe, und euch ein bisschen daran
  teilhaben lassen, von den kleinen Alltagsmomenten bis zu den großen Highlights.“, dann in eigenem Absatz „Wer mich
  besser kennt, weiß aber auch, dass ich nicht wirklich ein Social-Media-Typ bin. Von daher weiß ich noch nicht, ob ich
  hier wirklich regelmäßig schreiben werde. Schauen wir einfach mal, was die nächsten Wochen bringen werden :)“,
  dann wieder in eigenem Absatz „¡Viel Spaß beim Lesen und hasta pronto!“ und „Fabian“) in Textgröße (`--fs-text`), darunter der Knopf „Neuesten Beitrag
  lesen“ (Extra-Abstand zum Text: 28px am Handy, ab 900px 32px)
  und darüber die Reisetag-Anzeige (beide untereinander, unter dem Text). Die Routenkarte (`#ruta`) steht
  im HTML vor dem gelben Kasten, damit sie schwimmen kann. Unter 900px alles untereinander
  (Kasten, Text, Reisetag, Knopf, Karte; Reihenfolge per `order`). Über der Karte steht unter 900px sichtbar die
  Überschrift „Ruta“ (Titelgröße, direkt auf der Seite wie „Entradas“, nicht in der Karte); ab 900px nur
  noch für Screenreader.
- **Entradas** (`#entradas`): Raster `repeat(auto-fill, minmax(min(100%, 300px), 1fr))`, neueste
  zuerst. Karte: Foto (ab PR 4), Ort und Reisetag (z. B. „Ciudad de México · Tag 1“; ohne Ort nur der
  Tag), Titel (die ganze Karte ist klickbar), Textanfang des **Originals** (ca. 160 Zeichen),
  Fotoanzahl (nur wenn Fotos vorhanden), Sprachhinweis „ES · DE“ bzw. „DE“. Keine Kommentare.
  Lange Wörter brechen um (`overflow-wrap`), nichts läuft über den Kartenrand.
  Als Karten erscheinen nur die **6 neuesten** Beiträge. Gibt es mehr, folgt darunter ein eingeklapptes
  Feld „Ältere Beiträge (N)“ (natives `<details>`, funktioniert ohne JavaScript, `#aeltere-beitraege`):
  aufgeklappt eine Liste aller übrigen Beiträge, neueste zuerst, je Zeile Ort · Reisetag und Titel
  (Komponente `OlderPosts.astro`, Anzahl `RECENT_COUNT` in `index.astro`). Bis 6 Beiträge gibt es das Feld nicht.
- **Palabrita-Kachel** ganz unten vor dem Fußbereich: volle Marigold-Kachel mit Rahmen und hartem
  Schatten, links Karteikarten-Illustration (eigenes SVG), „Kennst du schon meine Vokabellern-App?“,
  „Hier geht's zu Palabrita.“, rechts dunkler Knopf „Palabrita öffnen →“. Die ganze Kachel ist ein
  Link auf `https://palabrita.fabiankonig.de` (`target="_blank" rel="noopener"`). Unter 600px bricht
  der Knopf unter den Text.

### 7.5 Beitragsseite (`/entradas/<ordner>/`)

- Titel (`h1`, Fraunces, `--fs-title`), optional `titleDe` darunter,
  Zeile „Ort · Tag X · Datum“ (ohne Ort nur Tag und Datum; vor Reisebeginn nur das Datum). Am Handy
  (unter 700px) steht der Ort in der ersten Zeile und „Tag X · Datum“ immer in der zweiten, ab 700px alles
  in einer Zeile.
- Schalter „Übersetzung ausblenden“ / „Übersetzung einblenden“ (echter `<button>` mit
  `aria-expanded` und `aria-controls`). Ohne JavaScript ist er verborgen, beide Kacheln sind sichtbar.
  Standard: Übersetzung sichtbar. Die Einstellung wird nicht gespeichert (keine Cookies/Speicher).
- Kachel **„Original“** mit Etikett „Mi español, sin corregir“ (Marigold): Text aus `original.md`
  unverändert (`white-space: pre-wrap`, `textContent` ist byte-gleich zur Datei). Jedes Segment steckt
  in einem `<span lang data-lang>`, ohne sichtbare Hervorhebung.
- Kachel **„Übersetzung“** (`lang="de"`): ein Absatz pro Absatz des Originals, spanische Segmente
  übersetzt, deutsche 1:1 (`data-lang="de"`). Keine farbliche Hervorhebung.
- **Lange Texte kürzen** (nur mit JavaScript): Ist ein Text länger als 13 Zeilen (`--fs-text`,
  Zeilenhöhe 1,65), zeigt die Kachel zunächst 10 Zeilen (`--shown-lines`) mit einem Verlauf zur
  Kachelfarbe und darunter den Knopf „Weiterlesen“ (`<button>` mit `aria-expanded` und
  `aria-controls`, für Screenreader mit Zusatz „(Original)“ bzw. „(Übersetzung)“). Aufgeklappt heißt er
  „Weniger anzeigen“; beim Zuklappen springt die Seite zum Kachelanfang, falls dieser aus dem Bild
  gerutscht ist. Auch ein Tipp auf den gekürzten Text klappt auf (nicht beim Markieren von Text).
  Beim Laden sind die Kacheln gekürzt. Der ganze Text bleibt im DOM (`textContent` unverändert).
  Kürzere Texte haben keinen Knopf; ohne JavaScript ist nichts gekürzt. Der Zustand wird nicht
  gespeichert. Die Kürzung gilt per CSS (`@media (scripting: enabled)`) schon vor dem Skript, damit
  nichts aufblitzt; das Skript hebt sie bei kurzen Texten auf (`data-state="off"`).
  - **Untereinander (Handy, oder nur eine Kachel):** Jede Kachel klappt für sich auf und zu.
  - **Nebeneinander (Computer):** Original und Übersetzung klappen immer **gemeinsam** auf und zu;
    jede Kachel hat ihren Knopf, aber jeder schaltet beide. Gekürzt wird nur, wenn **beide** Texte lang
    sind, sonst bleibt alles offen und es gibt keinen Knopf. „Nebeneinander“ wird gemessen (beide
    Kacheln sichtbar und auf gleicher Höhe), nicht an einer festen Breite; beim Ändern der Fensterbreite
    wird neu entschieden.
- Anordnung: Raster `repeat(auto-fit, minmax(min(100%, 340px), 1fr))`, also nebeneinander (Original
  links) bei genug Platz, sonst untereinander (Handy). Nur Deutsch oder Übersetzung ausgeblendet: eine
  Kachel in Lesebreite (höchstens 760px). Nur Deutsch: nur die Original-Kachel, kein Schalter.
- **Leerzeilen als kleine Absätze:** Der Google-Doc-Export liefert zwischen Absätzen oft zwei
  Leerzeilen. Sie ergeben im Original nur einen kleinen Absatzabstand (0,6 × `--fs-text`, wie zwischen
  den Absätzen der Übersetzung), egal wie viele Leerzeilen es sind. Die Zeilenumbrüche bleiben im Text
  (`textContent` byte-gleich); die überzähligen stecken in `<span class="para-gap">` ohne Zeilenhöhe.
- Darunter die Fotogalerie, Videos und der Link „← Alle Beiträge“ (zur Startseite `#entradas`).

### 7.6 Fotos und Lightbox

- **Bildskript** `scripts/images.mjs` (läuft bei `npm run build` und `npm run dev` vor Astro):
  verarbeitet nur Fotos, die im Frontmatter stehen (nicht verlinkte Dateien werden nie veröffentlicht),
  dekodiert HEIC/HEIF mit heic-convert, dreht nach EXIF-Ausrichtung, entfernt **alle** Metadaten
  bis auf die erlaubten Kameraangaben (siehe „Kameraangaben“ unten; nur im großen Bild),
  erzeugt WebP (Qualität 80) in 400 und 800 px Breite (Vorschau) und max. 1600 px lange Seite (groß),
  nie vergrößert; für das erste Foto eines Beitrags zusätzlich ein Open-Graph-Bild 1200×630 (JPEG).
  Dateinamen enthalten einen Inhalts-Hash (`<name>-<hash>-<größe>.webp`), daher dauerhaft
  zwischenspeicherbar. Zwischenspeicher `.cache/media/`, Ausgabe `public/media/`, Manifest
  `.cache/media-manifest.json` (Maße für `width`/`height`, `info` = Kamera-Textzeile, nur wenn das
  Foto Kameraangaben hat). Das Manifest enthält auch `clips` (Video und Standbild, siehe 7.7).
- **Prüfung:** Nach der Verarbeitung und nach `astro build` werden alle Bilder im Ausgabeordner auf
  EXIF, GPS, XMP und IPTC geprüft (sharp-Metadaten und Byte-Marker); HEIC/TIFF/RAW dürfen nicht
  veröffentlicht werden. Jeder Fund bricht den Build ab. Ausnahme: Das große Bild (`*-1600.webp`)
  und das Import-Foto dürfen EXIF mit den erlaubten Kameraangaben tragen (Positivliste, siehe
  unten); jedes andere Tag, GPS, Vorschaubild, XMP oder IPTC bleibt ein Fehler. Vorschaubilder
  (400/800 px) und das Open-Graph-Bild bleiben ohne jede Metadaten.
- **Kameraangaben** (`scripts/lib/camera.mjs`, Wunsch des Autors): Der Import (`shrinkPhoto`) und
  das Bildskript (nur große Version) behalten aus dem EXIF **ausschließlich** diese Angaben, alles
  andere wird entfernt (Positivliste, nie Negativliste): Kamera (`Make`, `Model`), Objektiv
  (`LensMake`, `LensModel`), `FNumber`, `ExposureTime`, `ISO`, `FocalLength`,
  `FocalLengthIn35mmFilm`, `DateTimeOriginal` (ohne Zeitzone und Sekundenbruchteile),
  `ExposureProgram`, `ExposureBiasValue`, `MeteringMode`, `Flash`, `WhiteBalance`. Dazu schreibt
  libvips rein technische Pflichtfelder (Ausrichtung, Auflösung, Pixelmaße, Versionen, Farbraum). Nie
  übernommen werden GPS, Seriennummern, Besitzer/Autor, Software, Beschreibungen, Kommentare,
  MakerNote, Vorschaubild, XMP, IPTC. Hat ein Foto keine dieser Angaben, bleibt es ganz ohne EXIF.
  Videos sind nicht betroffen (weiter ohne Metadaten).
  **Textzeile** (`cameraLine`, im Manifest als `info`): feste Reihenfolge Kamera · Objektiv · Blende ·
  Verschlusszeit · ISO · Brennweite, getrennt durch Mittelpunkt mit Leerzeichen (` · `); fehlt eine
  Angabe, entfällt sie ersatzlos, die Reihenfolge bleibt; ohne jede Angabe gibt es keine Zeile.
  Formate: Kamera = Hersteller + Modell ohne Doppelung (`Canon` + `Canon EOS R5` → `Canon EOS R5`;
  Herstellernamen in Großbuchstaben oder Kleinbuchstaben bekommen normale Schreibweise, Zusätze wie
  „Corporation“ entfallen; Modellkürzel wie `SM-S918B` stehen unverändert da); Objektiv wie gespeichert;
  Blende `f/1,8` (deutsches Komma, ohne überflüssige Null: `f/2`); Verschlusszeit `1/250 s` bzw. `2,5 s`;
  `ISO 100`; Brennweite `6,8 mm (24 mm KB)` (echte Brennweite, Kleinbild-Äquivalent in Klammern, nur
  wenn es sich unterscheidet; fehlt die echte, `24 mm KB`). Bestehende Fotos ohne Kameraangaben
  bekommen kein Feld; sie werden erst durch einen neuen Import aus den Originalen damit ausgestattet.
- **Profilfoto:** `content/profile.(jpg|png|webp|heic)` → quadratisch 240 und 132 px (3× für 76/44 px, WebP Qualität 92),
  sonst Platzhalter.
- **Galerie:** Raster `.media-grid` (global.css, gemeinsam mit den Videos) mit fester Spaltenzahl:
  Handy 2, ab 700px 3, ab 1000px 4 Spalten; Vorschaubilder
  mit `srcset` 400w/800w, `width`/`height`, `aspect-ratio: 4/3`, `object-fit: cover`, Lazy Loading ab
  dem 5. Bild, optionale Bildunterschrift. Ohne JavaScript verlinkt jedes Foto auf die große Version.
- **Mehr anzeigen (Fotos und Videos, `src/scripts/more.ts`):** Gezeigt werden immer 2 Reihen: am Handy
  4, bei 3 Spalten 6, bei 4 Spalten 8 Kacheln (`--limit` am Raster). Gibt es mehr, steht darunter der
  Knopf „Mehr anzeigen“ (`aria-expanded`, `aria-controls`, für Screenreader mit Zusatz „(Fotos)“ bzw.
  „(Videos)“); er zeigt **alle** übrigen auf einmal, danach heißt er „Weniger anzeigen“ (springt beim
  Zuklappen zur Überschrift, falls sie oben herausgerutscht ist). Fotos und Videos schalten getrennt.
  Gekürzt wird per CSS (`@media (scripting: enabled)`, `li:nth-child(n+5|7|9)`), damit nichts
  aufblitzt; ohne JavaScript ist alles sichtbar. Verborgene Fotos bleiben im DOM, die Lightbox
  blättert auch zu ihnen; sie laden erst, wenn sie sichtbar werden (Lazy Loading, `display: none`).
- **Lightbox:** `<dialog>` mit `showModal()` (Seite dahinter inaktiv), füllt den Bildschirm
  (`position: fixed; inset: 0`, kein `100vh`), Safe-Area-Abstände für iPhone. Zähler „3 / 12“,
  Knöpfe Schließen/Vor/Zurück (48px), Tastatur Esc/←/→, Wischen (Pointer-Events, mind. 50px
  waagerecht), Klick auf den Hintergrund schließt. Große Version wird erst beim Öffnen geladen,
  Nachbarbilder vorgeladen. Fokus startet auf „Schließen“ und kehrt zum Foto zurück.
  **Kamerafeld:** Unter dem Foto steht die Kamera-Textzeile (`data-info` am Link, Text vom Build) in
  einem schwarzen Feld mit weißer Schrift (zentriert, `0.9rem`, bricht am Handy um), im selben
  Rahmen wie das Foto und genau so breit wie das Foto (die Foto-Höhe ist Bühne minus Kamerafeld
  minus Bildunterschrift; `lightbox.ts` misst das Feld und setzt `--reserve`). Ohne Kameraangaben
  entfällt das Feld; eine Bildunterschrift steht darunter.
- **Bewegtfotos** (`motion`, `src/scripts/motion.ts`): Über dem Standbild liegt ein `<video muted loop
  playsinline preload="none" aria-hidden tabindex="-1">`, zunächst durchsichtig (`opacity: 0`, nicht
  `hidden`, weil ein verstecktes Element nie „im Bild“ ist). Ein `IntersectionObserver` startet es,
  sobald mindestens die Hälfte des Fotos sichtbar ist, und hält es an, wenn es das Bild verlässt;
  erst dann wird die Datei geladen. Läuft es, bekommt es `data-playing` (sichtbar). Bei
  „Bewegung reduzieren“ (`prefers-reduced-motion`), ohne JavaScript oder wenn der Browser das
  Abspielen verweigert (z. B. Stromsparmodus) bleibt es beim Standbild und nichts wird geladen.
  Klick und Lightbox zeigen weiter das Standbild.
- **Keine inhaltliche Auswertung der Medien** (Wunsch des Autors): Weder Agenten noch Import
  beschreiben oder analysieren, was auf Fotos und Videos zu sehen ist. `alt` und `title` bekommen
  neutrale Standardtexte (`Foto N von M`, `Video N`, vom Import vorgeschlagen); eine echte Beschreibung
  steht nur dort, wo der Autor sie selbst liefert. Der Ort eines Beitrags kommt aus dem Text, nie aus
  den Medien. Das ist eine bewusste Abwägung gegen die Barrierefreiheit (Alt-Texte beschreiben dann
  nicht den Inhalt); die Seite bleibt bedienbar, die Bildunterschrift (`caption`) kann der Autor
  jederzeit selbst setzen.
- **Beitragskarte:** Titelbild (3:2, Vorschaubild) und Fotoanzahl.

### 7.7 Videos

Alle Videos sind eigene Clips (`clips:`, Komponente `Videos.astro`, Klasse `.clip`):

- Das fertige MP4 liegt im Beitragsordner unter `clips/` und wird vom Bildskript (`images.mjs`) mit
  Inhalts-Hash nach `public/media/<slug>/` kopiert (`<name>-<hash>.mp4`, Standbild
  `<name>-<hash>-poster.jpg`). Beim Build wird nichts umgewandelt, ffmpeg ist dafür nicht nötig.
- Anzeige: **Vorschaukacheln im selben Raster und in derselben Größe wie die Fotos** (`.media-grid`,
  4:3, zugeschnitten, Standbild als Bild) mit Play-Symbol und Laufzeit „m:ss“ (`formatDuration`).
  Die Kachel ist ein Link auf das MP4 (`aria-label` „<title> abspielen, Dauer m:ss“). Mit JavaScript
  (`src/scripts/clips.ts`) öffnet ein Tipp ein Vollbild-`<dialog>` mit `<video controls playsinline
  preload="none">` und startet es (**nicht stumm**); erst dann wird die Datei geladen, vorher nur das
  kleine Standbild (etwa 15 bis 60 KB). Schließen per Knopf, Esc oder Klick auf den Hintergrund
  hält das Video an und gibt die Datei frei; der Fokus kehrt zur Kachel zurück. Ohne JavaScript öffnet
  der Link das MP4 im Player des Browsers. Der `title` steht im Fenster und im `aria-label`, nicht
  unter der Kachel. Mehr als 2 Reihen: Knopf „Mehr anzeigen“ wie bei den Fotos (siehe 7.6).
- Der Service Worker fasst Videos und Range-Anfragen nie an (`shouldHandle` lehnt `.mp4` ab):
  Videos werden gestreamt und nie vorab zwischengespeichert. GitHub Pages liefert Teilabrufe
  (Range); der Testserver `scripts/serve.mjs` tut das ebenfalls.
- **Import** (`scripts/import-media.mjs`, Logik in `scripts/lib/import.mjs` und `scripts/lib/video.mjs`),
  Aufruf `node scripts/import-media.mjs <quellordner> <slug>`: liest Handy-Originale (Foto: JPEG,
  PNG, WebP, HEIC; Video: MP4, MOV, M4V, 3GP, WebM, MKV), schreibt nur verkleinerte Dateien in den
  Beitragsordner (Originale werden nie kopiert) und druckt einen Frontmatter-Vorschlag.
  **Reihenfolge:** nach Aufnahmezeit (Zeitpunkt des Auslösens, älteste zuerst), erst alle Fotos, dann alle
  Videos; die Nummern `NN` und der Frontmatter-Vorschlag folgen dieser Reihenfolge. Quelle der Zeit
  (`scripts/lib/captured.mjs`): Foto EXIF `DateTimeOriginal` (+ `SubSecTimeOriginal`), dann
  `DateTimeDigitized`/`DateTime`; Video `creation_time` im Container (ffprobe); sonst ein Zeitstempel im
  Dateinamen (`PXL_20261124_153012345`, `IMG_20261124_153012`). Gleiche Zeit: nach Dateiname; Dateien ohne
  Zeit stehen am Ende der Gruppe. Das Titelbild ist davon getrennt: Es steht im Feld `cover` (siehe 6.1)
  und ändert die Reihenfolge nicht; ohne `cover` gilt `photos[0]`; mit `coverGenerated` ist kein Foto Titelbild. `node scripts/import-media.mjs --times <ordner>` zeigt nur die Zeiten, ohne zu schreiben.
  Fotos: JPEG Qualität 85, lange Seite höchstens 1600 px, ohne Metadaten bis auf die erlaubten
  Kameraangaben (siehe 7.6), `photos/NN.jpg`.
  **Android-Bewegtfotos** (Motion Photo: JPEG mit angehängtem MP4, erkennbar an `*.MP.jpg`; `extractMotionVideo`
  liest XMP `Item:Semantic="MotionPhoto"` mit `Item:Length` bzw. das ältere `MicroVideoOffset`) werden zu
  Foto **plus** stummer Schleife `photos/NN.mp4` (gleiche Umwandlung wie Videos, ohne Ton; das Foto
  trägt `motion: NN.mp4`). Normale Fotos bekommen keine Schleife.
  Videos: H.264 (Profil main) und AAC 96 kbit/s (Ton bleibt erhalten), kürzere Seite höchstens
  720 px (nie vergrößert), höchstens 30 Bilder/s, CRF 28 mit höchstens 2,5 Mbit/s, `+faststart`
  (Start vor dem vollständigen Laden, Spulen), `-map_metadata -1` (entfernt Standort und alle
  Metadaten), Standbild bei etwa 1 s (JPEG, 800 px). Grenzen: höchstens 180 s und 40 MiB je Clip;
  längere Videos werden übersprungen und gemeldet. Braucht ffmpeg und ffprobe (nur im Import und in
  den Tests, nicht im Build). Die Prüfung `mp4Problems` sucht in jedem Ergebnis nach Standort-Atomen
  (`©xyz`, `loci`), ISO-6709-Koordinaten und Metadatenschlüsseln; ein Fund bricht ab.
- **Prüfung beim Build:** Jedes MP4 in `content/` und in `dist` wird mit `mp4Problems` geprüft.
  Ein Standort-Fund bricht den Build ab.
- **Größe:** `check-dist.mjs` summiert die veröffentlichte Seite. Ab 700 MiB eine Warnung
  (`::warning::` in der CI), ab 900 MiB bricht der Build ab (GitHub Pages erlaubt 1 GB).
  Faustwert: ein Foto etwa 0,3 bis 0,5 MB (mit Vorschauen), ein Clip etwa 10 bis 20 MB je Minute.
  Wird es eng, können Videos in ein zweites Pages-Repository ausgelagert werden.

YouTube wird nicht verwendet. `videos:` im Frontmatter ist ein Fehler (Hinweis auf `clips`).

### 7.8 Routenkarte (`src/lib/map.ts`, `src/lib/geo.ts`, `RouteMap.astro`)

- Wird bei jedem Build **aus `content/places.yaml` erzeugt**, keine externen Kartendienste.
  Umrisse von México, Guatemala und den Nachbarländern sind selbst erstellte, grobe Polygone
  (Projektion: rechtwinklig mit Kosinus-Korrektur). Meer `turquoise-dark`, México `sand`,
  Guatemala `marigold`, Nachbarländer `land-other`.
- Beschriftungen der Gesamtkarte: nur „México“, „Golfo de México“, „Océano Pacífico“ und „Aquí estoy“
  am aktuellen Ort. **Keine Ortsnamen in der Karte**, nur in der Legende.
- Marker: nummerierte Kreise (`sand`, Rahmen `ink`); aktueller Ort `pink-text` mit hellem Text und
  pinkem Halo (pulsiert nur ohne `prefers-reduced-motion`). Route: gestrichelte Linie in Terrakotta in
  Reihenfolge der Liste. Das Schild „Aquí estoy“ wird so platziert, dass es keine Marker verdeckt.
- **Nahe Orte:** Liegen Orte in einer Gesamtkarte näher als ihr Markerdurchmesser (Computer 30
  Einheiten bei 800 Breite ≈ 28px; Handy 44 Einheiten bei 400 Breite), werden sie (auch über
  Ketten) zusammengefasst. Gruppen beider Varianten werden vereinigt, damit beide dieselben Gruppen
  zeigen. Jede Gruppe erscheint als rosa Pille mit Nummernbereich („8–12“, Lücken als „1, 3“), ein
  gestrichelter Rahmen markiert die Region, und es gibt eine **Ausschnittskarte** („Ausschnitt:
  Guatemala“) mit allen Orten einzeln (überlappende Marker werden auseinandergeschoben), gestrichelter
  Route und beschrifteten Nachbarländern (z. B. México, Belice, Honduras; das eigene Land wird nicht
  beschriftet). Titel: gemeinsame `region` der Orte, sonst Landesname, sonst „México y Guatemala“.
- **Layout:** Ein Ausschnitt steht rechts neben der Gesamtkarte, mehrere in einer Reihe darunter;
  am Handy alles untereinander.
- **Handy (< 600px):** eigene Gesamtkarte nur mit dem Süden (Reiseregion, erweitert sich automatisch,
  falls ein Ort weiter nördlich liegt), Marker mind. 28px auf dem Bildschirm (getestet bei 320px),
  größere Schrift. Umschaltung per CSS zwischen zwei SVGs (kein JavaScript).
- **Legende** (`<ol>`): Nummer und spanischer Name, aktueller Ort mit Etikett „Aquí estoy“ und
  rosa Nummer, Orte in Ausschnitten mit gelber Nummer. Am Computer mehrspaltig, am Handy einspaltig.
  Darunter: „Schematische Skizze, die Umrisse sind nur ungefähr.“
- Barrierefreiheit: Jede Karte ist ein `role="img"` mit Beschreibung; die Legende enthält alle Informationen.

### 7.9 Reisetag-Anzeige (`src/lib/travelDay.ts`, `TravelDay.astro`)

- Startseite, **über** dem Knopf „Neuesten Beitrag lesen“. Wird bei **jedem Seitenaufruf im Browser**
  berechnet (kleines Modul-Skript), mit dem heutigen Datum in der Zeitzone `America/Mexico_City`
  (`Intl.DateTimeFormat`), damit alle Besucher denselben Tag sehen. Gerechnet wird nur mit Datumswerten
  (UTC-Mitternacht), Sommer-/Winterzeit spielt keine Rolle.
- Texte: vor dem 23.11.2026 „Los geht's am 23. November 2026“; vom 23.11.2026 (Tag 1) bis 2.2.2027
  (Tag 72) „Heute ist der X. Tag der Reise“; ab 3.2.2027 „Reise nach 72 Tagen beendet“ (72 = Zahl der
  Reisetage, aus `tripStart` und `tripEnd`).
- Testbar über `travelStatus(datum)` / `travelTextFor(jetzt, vorschau)`. Vorschau eines Datums im
  Browser: `?datum=JJJJ-MM-TT` (ungültige Werte werden ignoriert).
- Ohne JavaScript: „Reise vom 23. November 2026 bis 2. Februar 2027“.
- Beitragskarten und Beitragsseiten zeigen den Reisetag des Beitragsdatums (gleiche Funktion).

### 7.10 Progressive Web App (Zusatz, darf die Seite nie kaputtmachen)

- **Manifest** `manifest.webmanifest` (aus `src/lib/pwa.ts`): Name, Kurzname „Viaje MX·GT“, alle Pfade
  relativ (`start_url`/`scope`/`id` = `./`), `display: standalone`, `theme_color`/`background_color`
  `#F6EBD9`, Icons 192/512 und maskable 512.
- **Icons** (`public/icons/`, eigenes Motiv: pinkes Papel-Picado-Fähnchen an einer Schnur auf
  Marigold), erzeugt mit `node scripts/make-icons.mjs` und eingecheckt: `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` (Motiv in der sicheren Zone), `apple-touch-icon.png` (180, ohne Transparenz),
  `favicon-32.png`, `favicon.svg`.
- **iOS/Safari:** `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`,
  `apple-mobile-web-app-status-bar-style`. Caches werden begrenzt (40 Seiten, 120 Dateien), weil
  Safari wenig Speicher erlaubt.
- **Service Worker** `sw.js` (erzeugt aus `src/pages/sw.js.ts`), Scope = Basispfad:
  HTML network-first (offline: zuletzt gesehene Fassung, sonst ein kurzer Offline-Hinweis);
  Bilder, Schriften, `_astro`, `media`, `icons` cache-first (Dateinamen mit Hash bzw. selten geändert);
  **Videos (`.mp4`, `video`-Anfragen, Range-Anfragen) nie**, sie werden direkt gestreamt.
  Cache-Namen `viaje:<basispfad>:<art>-<version>` (Version = Commit-SHA des Builds). Beim Aktivieren
  werden nur alte Caches **desselben Basispfads** gelöscht. Kein `skipWaiting`: Eine neue Version wird
  beim nächsten Besuch aktiv; weil HTML network-first ist, sieht trotzdem niemand eine veraltete Seite.
  Der Service Worker unter `/` ignoriert Anfragen unter `/pr-preview/`.
- **Vorschau-Builds** (`PREVIEW=true` oder Basispfad `/pr-preview/…`): keine Registrierung; `sw.js`
  meldet sich dort selbst ab.
- Registrierung über ein kleines Inline-Skript nach `load`; Fehler werden ignoriert.

### 7.11 Datenschutz, Suchmaschinen, rechtliche Seiten, Lizenzen

- **Jede Seite** (auch 404 und Vorschauen): `<meta name="robots" content="noindex, nofollow, noimageindex">`,
  `<meta name="copyright">` und die Copyright-Zeile im Fußbereich, Links zu Impressum, Datenschutz,
  Lizenzhinweisen. `robots.txt`: `User-agent: *` / `Disallow: /`.
- **Keine** Cookies, Tracker, Analytics, externen Schriften/Skripte/Karten. Erlaubte externe Links
  (geprüft beim Build): Palabrita und die Datenschutzerklärung von GitHub.
- **Open Graph** (Vorschau in WhatsApp): `og:type`, `og:site_name`, `og:locale`, `og:title`,
  `og:description`, `og:url`, `og:image` (absolute URL aus `SITE_URL` + Basispfad), Breite/Höhe/Alt.
  Beiträge mit Fotos: Titelbild als 1200×630-JPEG; sonst `public/og-default.jpg` (erzeugt mit
  `scripts/make-og.mjs` aus eigenem Design und den eigenen Schriften).
  Hinweis: `robots.txt` sperrt alles. WhatsApp erzeugt Link-Vorschauen auf dem Gerät des Absenders;
  sollte die Vorschau trotzdem fehlen, bewusst entscheiden, ob eine Ausnahme nötig ist (TODO.md).
- **Impressum** (`/impressum/`): Angaben nach § 5 DDG und § 18 Abs. 2 MStV aus `src/config.ts`
  (Name, Anschrift, E-Mail wie bei Palabrita), Haftung für Inhalte (§§ 7–10 DDG) und Links. **Datenschutz** (`/datenschutz/`): passend zur Technik (GitHub Pages inkl.
  IP-Adressen und USA/DPF, keine Cookies/Analyse, Service-Worker-Speicher auf dem Gerät, selbst
  gehostete Schriften, Videos (selbst ausgeliefert, keine Dritten), Link zu Palabrita, WhatsApp, Betroffenenrechte).
  Bei neuer Technik anpassen. Keine Rechtsberatung: vor Veröffentlichung prüfen lassen.
- **Lizenzhinweise** (`/lizenzhinweise/`): Rechtevorbehalt, Schriften (OFL, Lizenztexte unter
  `/fonts/`), eigene Werke, Übersicht der Werkzeuge (aus `package-lock.json`).
- **THIRD-PARTY-NOTICES.md** wird mit `npm run notices` aus `package-lock.json` erzeugt;
  `npm run lint` prüft, dass sie aktuell ist und **kein starkes Copyleft** (GPL/AGPL …) vorkommt.
  Schwaches Copyleft (LGPL, MPL) nur bei Werkzeugen, die nicht ausgeliefert werden.
- **Build-Prüfung** (`scripts/check-dist.mjs`, Teil von `npm run build`): interne Links/Bilder
  vorhanden, nur erlaubte externe Links, noindex/Copyright/og:image auf jeder Seite,
  HTML-Validierung (html-validate, `.htmlvalidate.json`), Seitengewicht der Startseite ohne Fotos
  höchstens 260 KB.

## 8. Deployment

- **Quelle von GitHub Pages: „GitHub Actions“** (vom Autor so eingestellt). Eigene Domain
  `viaje.fabiankonig.de` und „Enforce HTTPS“ sind in den Pages-Einstellungen gesetzt; DNS:
  `CNAME viaje → fabiankonig.github.io.` (`public/CNAME` liegt zur Dokumentation bei, wird bei dieser
  Quelle aber nicht ausgewertet).
- **`.github/workflows/deploy.yml`** bei jedem Push auf `main` (also nach jedem Merge) und manuell:
  1. `build`: `npm run build` mit `SITE_URL=https://viaje.fabiankonig.de` (Bildskript, Astro,
     Metadaten- und Build-Prüfung), Größenwarnung ab 700 MB, Abbruch ab 900 MB (Pages-Limit 1 GB),
  2. `deploy`: `actions/upload-pages-artifact` + `actions/deploy-pages` (Umgebung `github-pages`).
  Schlägt ein Schritt fehl, wird nicht veröffentlicht.
  Die Tests laufen dabei **nicht** erneut: Das Ruleset verlangt „Require branches to be up to date
  before merging“, der Pull-Request testet also genau den Stand, der in `main` landet.
- **`.github/workflows/ci.yml`** bei jedem Pull-Request: Tests wie oben, **mit angepasstem
  Testumfang**: `scripts/ci-scope.mjs` (Logik in `scripts/lib/ci-scope.mjs`) vergleicht die
  geänderten Dateien mit dem Stand von `main` und wählt
  `docs` (nur Dokumente im Hauptordner: Lint, Unit-Tests, `npm audit`; kein Build, keine Browser),
  `content` (nur `content/` und/oder Dokumente: zusätzlich Build und Browser-Tests nur in Chromium)
  oder `full` (alles andere: alle Browser). Im Zweifel (kein Pull-Request, Git-Fehler, unbekannte
  Datei) gilt `full`. Außer bei `docs` installiert die CI vor den Unit-Tests ffmpeg (Tests des Medien-Imports; der Build braucht es nicht). Der Job „Tests“ läuft immer, ohne Pfadfilter im Workflow, weil ein
  übersprungener Pflicht-Check das Mergen blockieren würde; übersprungen werden nur einzelne Schritte. Keine Artefakte (Screenshots
  und gebaute Seite wurden entfernt, der Autor kann ZIP-Dateien am Handy nicht öffnen). Bei einem
  Fehlschlag wird der Playwright-Bericht (7 Tage) hochgeladen. Das Aussehen prüft der Agent vor dem
  PR per Screenshot und beschreibt es im PR.
- **Keine Vorschau-Seiten** unter `/pr-preview/` (Entscheidung des Autors: Die bewährte Action
  rossjrw/pr-preview-action unterstützt die Pages-Quelle „GitHub Actions“ nicht). Der Code bleibt
  unterpfadfähig, falls das später gewünscht ist.
- **Merges nur per Squash**, nur grün (Branch-Schutz, TODO.md). Abhängigkeiten aktuell (Dependabot).
- Grenzen: Dateien höchstens 100 MiB, Repository möglichst unter 1 GB, veröffentlichte Seite unter 1 GB.

## 9. Browser- und Geräteunterstützung

Ziel: aktuelle und vorherige Hauptversion aller gängigen Browser, Breiten 320–2560px, Hoch- und
Querformat, Zoom bis 200 %, vergrößerte Systemschrift. Nur breit unterstützte Web-Funktionen
(`<dialog>`, CSS Grid, `aspect-ratio`, `clamp()`, `env(safe-area-inset-*)`, Pointer Events,
`Intl.DateTimeFormat` mit Zeitzone, Service Worker optional). Progressive Enhancement: Ohne
JavaScript sind Beiträge, Übersetzung (als Text), Fotos (als Links), Karte und Reisezeitraum lesbar;
JavaScript braucht es nur für Schalter, Lightbox, Reisetag und PWA (Videos laufen mit den Bedienelementen des Browsers).

| Plattform | Browser | Automatisiert | Wo |
| --- | --- | --- | --- |
| Desktop | Chromium (Chrome, Brave, Opera, Vivaldi) | ja, Projekt `chromium` | jeder PR |
| Desktop | Firefox | ja, `firefox` | jeder PR |
| Desktop | Safari (WebKit) | ja, `webkit` | jeder PR |
| Desktop | Google Chrome (echter Kanal) | ja, `chrome` | nächtlich/manuell |
| Desktop | Microsoft Edge (echter Kanal) | ja, `msedge` | nächtlich/manuell |
| Android | Chrome | Profil Pixel 7 (`mobile-chrome`) | jeder PR |
| Android | Chromium-Browser auf Samsung-Gerät | Profil Galaxy S9+ (`galaxy`) | nächtlich/manuell |
| Android | Samsung Internet, Firefox, Edge, Opera | nein | manuell (MANUAL-TESTS.md) |
| iPhone | Safari, Chrome, Firefox, Edge (alle WebKit) | Profil iPhone 15 (`mobile-safari`) | jeder PR |
| iPad | Safari | Profil iPad gen 7 (`ipad`) | nächtlich/manuell |
| echte Geräte | alle | nein | manuell (MANUAL-TESTS.md) |

Breiten 320, 390, 768, 1280, 1920, 2560px, Zoom 200 % und vergrößerte Schrift werden in Chromium
geprüft (Layout-Tests), die Handy-Profile decken Touch und Geräte-Viewport ab.

## 10. Tests

Befehle: [AGENTS.md › Tests](AGENTS.md#tests). Jede neue Funktion bekommt einen Test. Welche Tests die CI im Pull-Request ausführt, hängt von den geänderten Dateien ab (Abschnitt 8, `ci.yml`); der nächtliche Lauf deckt alles ab.

| Bereich | Wo | Was |
| --- | --- | --- |
| Lint | `npm run lint` | Prettier, eingecheckte-aber-ignorierte Dateien, THIRD-PARTY-NOTICES aktuell, kein starkes Copyleft |
| Sicherheit | CI | `npm audit --audit-level=moderate` |
| Unit | `tests/unit` (Vitest) | Pfade, Datumshilfen, Reisetag (vor Start, Tag 1, Tag 72, 3.2., danach, Monats-/Jahreswechsel, Zeitzonengrenzen), Ortsliste/Nummerierung, Zusammenfassung naher Orte, Kartenerzeugung, Beitrags-Parser (gemischt, nur Spanisch, nur Deutsch), Frontmatter-Prüfung (Pflichtfelder, Ort existiert, Fotos existieren, max. 20), Bild-Pipeline (GPS rein → ohne Metadaten raus, Größe, Drehung, HEIC, Abbruch), Kameraangaben (Positivliste: erlaubte Werte bleiben, GPS/Seriennummer/Besitzer nie; Textzeile: Reihenfolge, fehlende Angaben, Formate; Prüfung nur im großen Bild), Medien-Import (Reihenfolge nach Aufnahmezeit, Foto und Video verkleinern, Standort entfernen, Ton behalten, Hochformat, Nummerierung, Bewegtfoto → Foto + Schleife; nur mit ffmpeg), Skill `neuer-beitrag` (vorhanden, verweist auf existierende AGENTS-Abschnitte), Videos im Bildskript (Manifest, Standort-Abbruch), Größenprüfung der Seite, PWA-Logik (Videos nie über den Service Worker), Lizenzen, SPEC↔Code (Versionen, Farben, Texte, Workflows) |
| Build | `npm run build` | Bildskript mit GPS-Prüfung (Fotos und Videos), Größe der Seite (Warnung/Fehler), HTML-Validierung, interne Links, erlaubte externe Links, noindex/Copyright/og:image je Seite, Seitengewicht |
| Browser | `tests/e2e` (Playwright) | Smoke (keine Konsolenfehler, keine fehlgeschlagenen oder Drittanbieter-Anfragen), Startseite, Beitragsseite, Originaltreue (byte-gleich), Schalter, Lightbox (Maus, Tastatur, Wischen), Videos (keine Anfrage vor Klick; Clips: Standbild vorab, Video erst nach „Play“, Ton nicht stumm, Teilabrufe, ohne JavaScript), Bewegtfotos (unsichtbar und ungeladen bis zum Hineinscrollen, stumm, „Bewegung reduzieren“ und ohne JavaScript nur Standbild), Karte (Pillen, Ausschnitte, Markergröße am Handy), Reisetag mit festgestellter Uhrzeit, PWA (Manifest, Service Worker, Cache-Bereinigung, offline, keine Vorschau-Registrierung), Rechtliches (Crawl aller Seiten: noindex, Copyright, Links, OG, keine Cookies), Layout (320–2560px, kein Überlauf, Profilbild rechts oben, Zoom, große Schrift), Barrierefreiheit (axe WCAG 2.2 AA inkl. Kontrast, Tastatur, Touch-Ziele), Unterpfad, 404, ohne JavaScript |
| Grenzfälle | `tests/fixtures/content` | Beitrag ohne Fotos, mit 20 Fotos, sehr langer Titel, sehr langer Text, ohne Ort, nur Deutsch, nur Spanisch, Sonderzeichen, GPS-/HEIC-Foto, Bewegtfoto, eigener Clip, Route mit 12 Orten |
| Nächtlich | `nightly.yml` | alle Browser-Projekte inkl. Edge/Chrome/iPad/Galaxy, Erreichbarkeit von Palabrita, `npm audit` |
| Manuell | `MANUAL-TESTS.md` | echte Geräte, Samsung Internet, Firefox Android, Home-Bildschirm, WhatsApp-Vorschau |

Nicht umgesetzt (bewusst): visuelle Regressionstests per Pixelvergleich (zwischen Betriebssystemen
unzuverlässig; stattdessen Layout-Prüfungen) und Lighthouse-CI
(zusätzliche große Abhängigkeit; Seitengewicht und Barrierefreiheit werden direkt geprüft).
