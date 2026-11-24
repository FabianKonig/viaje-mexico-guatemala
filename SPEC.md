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
| `photos[]` | nein | `file` (in `photos/`), `alt` (Pflicht), `caption` (optional); höchstens 20 |
| `clips[]` | nein | eigenes Video: `file` (`.mp4` in `clips/`, dazu `clips/<name>.jpg` als Standbild), `title` (Pflicht, Beschreibung), `width`, `height`, `duration` (trägt der Import ein); höchstens 20 |
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

- **Titelbereich** ohne Überschrift und ohne Titelfoto. Ab 900px zwei Spalten (5:7), oben bündig
  (`align-items: start`): links der gelbe Kasten mit dem Text ¡Bienvenido / Willkommen! (Marigold, Rahmen, Schatten),
  darunter der Begrüßungstext („¡Hola! Schön, dass du hier bist. Dies ist
  mein Versuch eines Reiseblogs. Und zugleich ein Versuch, mein Spanisch durch Schreiben zu festigen. Mit
  Beiträgen mal auf Spanisch (und inklusiver aller Anfängerfehler), aber auch mal auf Deutsch, je nach Lust und
  Laune. Und keine Sorge, falls tú no hablas español: Die deutsche Übersetzung steht immer daneben. Wer mich
  besser kennt, weiß, dass ich nicht wirklich ein Social Media Typ bin. Von daher weiß ich noch nicht, ob ich
  hier wirklich regelmäßig schreiben werde. Schauen wir einfach Mal, was die nächsten Wochen bringen werden :)“,
  dann in eigenem Absatz „¡Viel Spaß beim Lesen und hasta pronto!“ und „Fabian“) in `clamp(17px, 1.2vw + 12px, 24px)`, darunter der Knopf „Neuesten Beitrag
  lesen“ (Extra-Abstand zum Text: 28px am Handy, ab 900px 32px)
  und die Reisetag-Anzeige. Rechts die Routenkarte (`#ruta`). Unter 900px alles untereinander.
- **Entradas** (`#entradas`): Raster `repeat(auto-fill, minmax(min(100%, 300px), 1fr))`, neueste
  zuerst. Karte: Foto (ab PR 4), Ort und Reisetag (z. B. „Ciudad de México · Tag 1“; ohne Ort nur der
  Tag), Titel (die ganze Karte ist klickbar), Textanfang des **Originals** (ca. 160 Zeichen),
  Fotoanzahl (nur wenn Fotos vorhanden), Sprachhinweis „ES · DE“ bzw. „DE“. Keine Kommentare.
  Lange Wörter brechen um (`overflow-wrap`), nichts läuft über den Kartenrand.
- **Palabrita-Kachel** ganz unten vor dem Fußbereich: volle Marigold-Kachel mit Rahmen und hartem
  Schatten, links Karteikarten-Illustration (eigenes SVG), „Kennst du schon meine Vokabellern-App?“,
  „Hier geht's zu Palabrita.“, rechts dunkler Knopf „Palabrita öffnen →“. Die ganze Kachel ist ein
  Link auf `https://palabrita.fabiankonig.de` (`target="_blank" rel="noopener"`). Unter 600px bricht
  der Knopf unter den Text.

### 7.5 Beitragsseite (`/entradas/<ordner>/`)

- Großer Titel (`h1`, Fraunces, `clamp(2.25rem, 1.5rem + 3.5vw, 4rem)`), optional `titleDe` darunter,
  Zeile „Ort · Tag X · Datum“ (ohne Ort nur Tag und Datum; vor Reisebeginn nur das Datum).
- Schalter „Übersetzung ausblenden“ / „Übersetzung einblenden“ (echter `<button>` mit
  `aria-expanded` und `aria-controls`). Ohne JavaScript ist er verborgen, beide Kacheln sind sichtbar.
  Standard: Übersetzung sichtbar. Die Einstellung wird nicht gespeichert (keine Cookies/Speicher).
- Kachel **„Original“** mit Etikett „Mi español, sin corregir“ (Marigold): Text aus `original.md`
  unverändert (`white-space: pre-wrap`, `textContent` ist byte-gleich zur Datei). Jedes Segment steckt
  in einem `<span lang data-lang>`, ohne sichtbare Hervorhebung.
- Kachel **„Übersetzung“** (`lang="de"`): ein Absatz pro Absatz des Originals, spanische Segmente
  übersetzt, deutsche 1:1 (`data-lang="de"`). Keine farbliche Hervorhebung.
- Anordnung: Raster `repeat(auto-fit, minmax(min(100%, 340px), 1fr))`, also nebeneinander (Original
  links) bei genug Platz, sonst untereinander. Nur Deutsch: nur die Original-Kachel, kein Schalter.
- Darunter die Fotogalerie, Videos und der Link „← Alle Beiträge“ (zur Startseite `#entradas`).

### 7.6 Fotos und Lightbox

- **Bildskript** `scripts/images.mjs` (läuft bei `npm run build` und `npm run dev` vor Astro):
  verarbeitet nur Fotos, die im Frontmatter stehen (nicht verlinkte Dateien werden nie veröffentlicht),
  dekodiert HEIC/HEIF mit heic-convert, dreht nach EXIF-Ausrichtung, entfernt **alle** Metadaten,
  erzeugt WebP (Qualität 80) in 400 und 800 px Breite (Vorschau) und max. 1600 px lange Seite (groß),
  nie vergrößert; für das erste Foto eines Beitrags zusätzlich ein Open-Graph-Bild 1200×630 (JPEG).
  Dateinamen enthalten einen Inhalts-Hash (`<name>-<hash>-<größe>.webp`), daher dauerhaft
  zwischenspeicherbar. Zwischenspeicher `.cache/media/`, Ausgabe `public/media/`, Manifest
  `.cache/media-manifest.json` (Maße für `width`/`height`). Das Manifest enthält auch `clips`
  (Video und Standbild, siehe 7.7).
- **Prüfung:** Nach der Verarbeitung und nach `astro build` werden alle Bilder im Ausgabeordner auf
  EXIF, GPS, XMP und IPTC geprüft (sharp-Metadaten und Byte-Marker); HEIC/TIFF/RAW dürfen nicht
  veröffentlicht werden. Jeder Fund bricht den Build ab.
- **Profilfoto:** `content/profile.(jpg|png|webp|heic)` → quadratisch 240 und 132 px (3× für 76/44 px, WebP Qualität 92),
  sonst Platzhalter.
- **Galerie:** Raster (Handy mind. 2 Spalten à 150px, ab 700px `minmax(220px, 1fr)`), Vorschaubilder
  mit `srcset` 400w/800w, `width`/`height`, `aspect-ratio: 4/3`, `object-fit: cover`, Lazy Loading ab
  dem 5. Bild, optionale Bildunterschrift. Ohne JavaScript verlinkt jedes Foto auf die große Version.
- **Lightbox:** `<dialog>` mit `showModal()` (Seite dahinter inaktiv), füllt den Bildschirm
  (`position: fixed; inset: 0`, kein `100vh`), Safe-Area-Abstände für iPhone. Zähler „3 / 12“,
  Knöpfe Schließen/Vor/Zurück (48px), Tastatur Esc/←/→, Wischen (Pointer-Events, mind. 50px
  waagerecht), Klick auf den Hintergrund schließt. Große Version wird erst beim Öffnen geladen,
  Nachbarbilder vorgeladen. Fokus startet auf „Schließen“ und kehrt zum Foto zurück.
- **Beitragskarte:** erstes Foto (3:2, Vorschaubild) und Fotoanzahl.

### 7.7 Videos

Alle Videos sind eigene Clips (`clips:`, Komponente `Videos.astro`, Klasse `.clip`):

- Das fertige MP4 liegt im Beitragsordner unter `clips/` und wird vom Bildskript (`images.mjs`) mit
  Inhalts-Hash nach `public/media/<slug>/` kopiert (`<name>-<hash>.mp4`, Standbild
  `<name>-<hash>-poster.jpg`). Beim Build wird nichts umgewandelt, ffmpeg ist dafür nicht nötig.
- Anzeige: `<video controls playsinline preload="none" poster=…>`, **nicht stumm, kein Autoplay**.
  Vor dem Antippen von „Play“ lädt der Browser nur das Standbild (etwa 15 bis 60 KB), nie das Video.
  Darunter der `title`. Ohne JavaScript funktioniert das genauso (native Bedienelemente), ohne
  Videounterstützung erscheint ein Link „Video herunterladen“. `max-height: 75vh`, damit
  Hochformat-Clips auf dem Handy nicht höher als der Bildschirm werden.
- Der Service Worker fasst Videos und Range-Anfragen nie an (`shouldHandle` lehnt `.mp4` ab):
  Videos werden gestreamt und nie vorab zwischengespeichert. GitHub Pages liefert Teilabrufe
  (Range); der Testserver `scripts/serve.mjs` tut das ebenfalls.
- **Import** (`scripts/import-media.mjs`, Logik in `scripts/lib/import.mjs` und `scripts/lib/video.mjs`),
  Aufruf `node scripts/import-media.mjs <quellordner> <slug>`: liest Handy-Originale (Foto: JPEG,
  PNG, WebP, HEIC; Video: MP4, MOV, M4V, 3GP, WebM, MKV), schreibt nur verkleinerte Dateien in den
  Beitragsordner (Originale werden nie kopiert) und druckt einen Frontmatter-Vorschlag.
  Fotos: JPEG Qualität 85, lange Seite höchstens 1600 px, ohne Metadaten, `photos/NN.jpg`.
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

- Startseite, unter dem Knopf „Neuesten Beitrag lesen“. Wird bei **jedem Seitenaufruf im Browser**
  berechnet (kleines Modul-Skript), mit dem heutigen Datum in der Zeitzone `America/Mexico_City`
  (`Intl.DateTimeFormat`), damit alle Besucher denselben Tag sehen. Gerechnet wird nur mit Datumswerten
  (UTC-Mitternacht), Sommer-/Winterzeit spielt keine Rolle.
- Texte: vor dem 23.11.2026 „Los geht's am 23. November 2026“; vom 23.11.2026 (Tag 1) bis 2.2.2027
  (Tag 72) „Tag X unterwegs“; ab 3.2.2027 „Reise beendet · wieder zurück in Alemania“.
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
  Beiträge mit Fotos: erstes Foto als 1200×630-JPEG; sonst `public/og-default.jpg` (erzeugt mit
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
| Unit | `tests/unit` (Vitest) | Pfade, Datumshilfen, Reisetag (vor Start, Tag 1, Tag 72, 3.2., danach, Monats-/Jahreswechsel, Zeitzonengrenzen), Ortsliste/Nummerierung, Zusammenfassung naher Orte, Kartenerzeugung, Beitrags-Parser (gemischt, nur Spanisch, nur Deutsch), Frontmatter-Prüfung (Pflichtfelder, Ort existiert, Fotos existieren, max. 20), Bild-Pipeline (GPS rein → ohne Metadaten raus, Größe, Drehung, HEIC, Abbruch), Medien-Import (Foto und Video verkleinern, Standort entfernen, Ton behalten, Hochformat, Nummerierung; nur mit ffmpeg), Videos im Bildskript (Manifest, Standort-Abbruch), Größenprüfung der Seite, PWA-Logik (Videos nie über den Service Worker), Lizenzen, SPEC↔Code (Versionen, Farben, Texte, Workflows) |
| Build | `npm run build` | Bildskript mit GPS-Prüfung (Fotos und Videos), Größe der Seite (Warnung/Fehler), HTML-Validierung, interne Links, erlaubte externe Links, noindex/Copyright/og:image je Seite, Seitengewicht |
| Browser | `tests/e2e` (Playwright) | Smoke (keine Konsolenfehler, keine fehlgeschlagenen oder Drittanbieter-Anfragen), Startseite, Beitragsseite, Originaltreue (byte-gleich), Schalter, Lightbox (Maus, Tastatur, Wischen), Videos (keine Anfrage vor Klick; Clips: Standbild vorab, Video erst nach „Play“, Ton nicht stumm, Teilabrufe, ohne JavaScript), Karte (Pillen, Ausschnitte, Markergröße am Handy), Reisetag mit festgestellter Uhrzeit, PWA (Manifest, Service Worker, Cache-Bereinigung, offline, keine Vorschau-Registrierung), Rechtliches (Crawl aller Seiten: noindex, Copyright, Links, OG, keine Cookies), Layout (320–2560px, kein Überlauf, Profilbild rechts oben, Zoom, große Schrift), Barrierefreiheit (axe WCAG 2.2 AA inkl. Kontrast, Tastatur, Touch-Ziele), Unterpfad, 404, ohne JavaScript |
| Grenzfälle | `tests/fixtures/content` | Beitrag ohne Fotos, mit 20 Fotos, sehr langer Titel, sehr langer Text, ohne Ort, nur Deutsch, nur Spanisch, Sonderzeichen, GPS-/HEIC-Foto, eigener Clip, Route mit 12 Orten |
| Nächtlich | `nightly.yml` | alle Browser-Projekte inkl. Edge/Chrome/iPad/Galaxy, Erreichbarkeit von Palabrita, `npm audit` |
| Manuell | `MANUAL-TESTS.md` | echte Geräte, Samsung Internet, Firefox Android, Home-Bildschirm, WhatsApp-Vorschau |

Nicht umgesetzt (bewusst): visuelle Regressionstests per Pixelvergleich (zwischen Betriebssystemen
unzuverlässig; stattdessen Layout-Prüfungen) und Lighthouse-CI
(zusätzliche große Abhängigkeit; Seitengewicht und Barrierefreiheit werden direkt geprüft).
