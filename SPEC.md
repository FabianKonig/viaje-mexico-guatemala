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
| prettier | 3.10.1 |
| prettier-plugin-astro | 1.1.2 |
| yaml | 2.9.1 |
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
| Design und Startseite | 2 | geplant |
| Beitragsseite, Zweisprachigkeit | 3 | geplant |
| Fotos, Lightbox, Bildskript, Videos | 4 | geplant |
| Routenkarte, Ortsliste | 5 | geplant |
| Reisetag-Anzeige | 6 | geplant |
| PWA | 7 | geplant |
| Impressum, Datenschutz, noindex, Lizenzhinweise | 8 | geplant |
| Deployment und Vorschauen | 9 | geplant |
| Cross-Browser-Tests, manuelle Checkliste | 10 | geplant |

Die folgenden Abschnitte beschreiben das Zielverhalten. Was noch „geplant“ ist, wird im jeweiligen
Pull-Request umgesetzt und dann hier als „umgesetzt“ markiert.

## 6. Tests

Siehe [AGENTS.md › Tests](AGENTS.md#tests) für Befehle. In jedem Pull-Request laufen in GitHub
Actions: `npm audit`, Lint/Format, Unit-Tests, Build beider Varianten, Browser-Tests (Chromium).
Weitere Browser-Projekte und nächtliche Läufe folgen in PR 10.
