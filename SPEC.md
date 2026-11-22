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
      photos/                 Fotos des Beitrags (bis 20)
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
| `BASE_PATH` | Basispfad, z. B. `/pr-preview/pr-12/` | `/` |
| `OUT_DIR` | Ausgabeordner | `dist` |
| `CONTENT_DIR` | Inhaltsordner | `content` |
| `PREVIEW` | `true` = Vorschau (kein Service Worker) | aus |

Alle internen Links und Ressourcen werden über den Basispfad gebildet (`src/lib/paths.ts`). Die
Seite funktioniert unverändert unter `/` und unter `/pr-preview/pr-NN/`.

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
| Deployment und Vorschauen | 9 | geplant |
| Cross-Browser-Tests, manuelle Checkliste | 10 | geplant |

Die folgenden Abschnitte beschreiben das Zielverhalten. Was noch „geplant“ ist, wird im jeweiligen
Pull-Request umgesetzt und dann hier als „umgesetzt“ markiert.

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
| `videos[]` | nein | `youtube` (11-stellige ID), `title` |
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
   verlinke ich jeden neuen Eintrag.“), Copyright-Zeile `© 2026–2027 [VOLLER NAME]. Alle Rechte
   vorbehalten.`, Links zu Impressum, Datenschutz, Lizenzhinweise (PR 8). Kein Link „Über das Projekt“.
4. Sprunglink „Zum Inhalt springen“ für Tastaturnutzer.

### 7.4 Startseite

- **Titelbereich** ohne Überschrift und ohne Titelfoto. Ab 900px zwei Spalten (5:7), oben bündig
  (`align-items: start`): links der gelbe Kasten „México & Guatemala“ (Marigold, Rahmen, Schatten),
  darunter „Mein Reisetagebuch, auf Spanisch geschrieben, mit allen Fehlern. Daneben immer die deutsche
  Übersetzung.“ in `clamp(17px, 1.2vw + 12px, 24px)`, darunter der Knopf „Neuesten Beitrag lesen“
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
  `.cache/media-manifest.json` (Maße für `width`/`height`).
- **Prüfung:** Nach der Verarbeitung und nach `astro build` werden alle Bilder im Ausgabeordner auf
  EXIF, GPS, XMP und IPTC geprüft (sharp-Metadaten und Byte-Marker); HEIC/TIFF/RAW dürfen nicht
  veröffentlicht werden. Jeder Fund bricht den Build ab.
- **Profilfoto:** `content/profile.(jpg|png|webp|heic)` → quadratisch 152 und 88 px (2× für 76/44 px),
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

### 7.7 Videos (Zwei-Klick-Lösung)

Videos liegen nie im Repository. `videos: [{ youtube: ID, title }]` zeigt einen Platzhalter mit
Hinweis auf die Datenübertragung und dem Knopf „Video laden“. Erst danach wird
`https://www.youtube-nocookie.com/embed/ID` eingebunden. Ohne JavaScript nur ein Link „Auf YouTube ansehen“.

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
  Bilder, Schriften, `_astro`, `media`, `icons` cache-first (Dateinamen mit Hash bzw. selten geändert).
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
  (geprüft beim Build): Palabrita, YouTube (nur Link/Zwei-Klick), Datenschutzerklärungen von GitHub und Google.
- **Open Graph** (Vorschau in WhatsApp): `og:type`, `og:site_name`, `og:locale`, `og:title`,
  `og:description`, `og:url`, `og:image` (absolute URL aus `SITE_URL` + Basispfad), Breite/Höhe/Alt.
  Beiträge mit Fotos: erstes Foto als 1200×630-JPEG; sonst `public/og-default.jpg` (erzeugt mit
  `scripts/make-og.mjs` aus eigenem Design und den eigenen Schriften).
  Hinweis: `robots.txt` sperrt alles. WhatsApp erzeugt Link-Vorschauen auf dem Gerät des Absenders;
  sollte die Vorschau trotzdem fehlen, bewusst entscheiden, ob eine Ausnahme nötig ist (TODO.md).
- **Impressum** (`/impressum/`): Angaben nach § 5 DDG und § 18 Abs. 2 MStV mit Platzhaltern aus
  `src/config.ts`. **Datenschutz** (`/datenschutz/`): passend zur Technik (GitHub Pages inkl.
  IP-Adressen und USA/DPF, keine Cookies/Analyse, Service-Worker-Speicher auf dem Gerät, selbst
  gehostete Schriften, YouTube per Zwei-Klick, Link zu Palabrita, WhatsApp, Betroffenenrechte).
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

## 8. Tests

Siehe [AGENTS.md › Tests](AGENTS.md#tests) für Befehle. In jedem Pull-Request laufen in GitHub
Actions: `npm audit`, Lint/Format, Unit-Tests, Build beider Varianten, Browser-Tests (Chromium).
Weitere Browser-Projekte und nächtliche Läufe folgen in PR 10.
