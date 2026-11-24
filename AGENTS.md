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
    alt: 'Foto 1 von 18'           # Pflicht: kurzer deutscher Alt-Text, Standard „Foto N von M“ (kein Bildinhalt)
    caption: 'El Zócalo'           # optional: Bildunterschrift
    motion: 02.mp4                 # optional: Bewegtfoto, stumme Schleife in photos/ (trägt der Import ein)
clips:                             # optional, höchstens 20: eigene Videos (Standard für Handyclips)
  - file: 01.mp4                   # Datei in clips/ (der Import erzeugt sie samt Standbild 01.jpg)
    title: 'Video 1'               # Pflicht: Standard „Video N“ (der Inhalt wird nicht beschrieben)
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

1. **Branch** `post/<JJJJ-MM-TT-slug>` von aktuellem `main` anlegen. (Der frühere Beispielbeitrag ist
   weg; er liegt nur noch als Testinhalt in `tests/fixtures/content/`. Die E2E-Tests dürfen sich nicht auf
   einen bestimmten echten Beitrag festlegen: sie nehmen `latestRealPost()` aus `tests/e2e/fixtures.ts`.)
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
   `clips/` legen.** Dann `photos:` und `clips:` in `index.md` eintragen, mit den **neutralen
   Standardtexten** des Skripts (`alt: 'Foto N von M'`, `title: 'Video N'`). **Die Mediendateien nicht
   ansehen und nicht inhaltlich beschreiben** (Regel „Medien nicht inhaltlich auswerten“ unten).
   Android-Bewegtfotos (`*.MP.jpg`) werden zum Foto **plus**
   stummer Schleife (`photos/NN.mp4`, Feld `motion`). **Jedes** Foto und Video, das der Autor schickt, wird
   übernommen (Videos mit Ton, nicht stumm). Zu lange Videos (über 180 s) meldet das Skript; dann dem
   Autor sagen, dass er es kürzen soll. Braucht ffmpeg
   (`sudo apt-get install -y ffmpeg`, falls es fehlt).
7. **Ort klären:** Ist der Ort aus dem **Text** **eindeutig** erkennbar (nie aus den Medien)? Wenn nicht: **den Autor
   fragen, wo er gerade ist. Nie raten.**
8. **Karte und Ortsliste aktualisieren:** Neuer Ort → am Ende von `content/places.yaml` eintragen
   (wird automatisch „Aquí estoy“). Bekannter Ort → nur `place:` im Beitrag setzen.
9. **Tests:** `npm test`. Screenshots von Startseite und Beitrag (Handy und Computer) nur zur
   **Layoutprüfung** ansehen (Anordnung, Überlauf, Abstände), nicht um Bildinhalte zu beschreiben.
10. **Pull-Request** öffnen: kurze Beschreibung, erkannte Sprachen, offene Fragen (Ort, Titel).
11. **Lern-Datei** (nur bei Beiträgen mit spanischen Passagen): sobald der Autor „fertig“ sagt, das
    Google Doc `Lernhilfe-<slug>` im Drive-Unterordner des Beitrags anlegen und das Sammel-Doc
    `Lernhilfe-Übersicht` aktualisieren (Regeln: Abschnitt „Spanisch-Lernhilfe“). In der
    Abschlussmeldung den Link nennen.

## Bestehenden Beitrag ändern (Medien oder Text)

Der Autor meldet z. B. „Beitrag `<slug>`: ein Foto dazu, zwei weg“ oder „ich habe den Text geändert“.
Eigener Branch (z. B. `fix/<slug>-update`), Änderungen sammeln und erst bei „fertig“ pushen.

**Was im Drive-Unterordner liegt:** Text-Doc, Fotos, Videos, Bewegtfotos **und** `Lernhilfe-<slug>`
(Lern-Datei, siehe „Spanisch-Lernhilfe“); im Hauptordner zusätzlich `Lernhilfe-Übersicht`.
**Dateien, deren Name mit `Lernhilfe-` oder `tmp-` beginnt, sind nie Medien und nie der
Beitragstext.** Nicht herunterladen, nicht importieren, nicht als „neu“, „überzählig“ oder „unbekannt“
melden, nicht löschen (außer beim bewussten Neuaufbau der Lern-Datei). Das **Text-Doc** ist das Google
Doc im Unterordner ohne diese Präfixe. Alles andere Unbekannte: den Autor fragen.

**Medien geändert:**

1. Drive-Unterordner listen (ohne `Lernhilfe-`/`tmp-`). Der Import hat die Dateien nach Namen sortiert
   nummeriert (`photos/NN.jpg`, `clips/NN.mp4`); so lässt sich zuordnen, welche Datei neu ist und
   welche fehlt. Ist es nicht eindeutig (Namen vertauscht, mehrere Änderungen), den Autor nach den
   Dateinamen fragen, nie raten.
2. **Neue Dateien:** nur diese in einen neuen, leeren Ordner außerhalb von `content/` laden und mit
   `node scripts/import-media.mjs <ordner> <slug>` importieren. Die Nummern laufen weiter. Bereits
   vorhandene Dateien nicht erneut importieren.
3. **Entfernte Dateien:** die Dateien in `photos/` bzw. `clips/` löschen (bei Bewegtfotos auch
   `NN.mp4`, bei Videos `NN.jpg`) und die Einträge in `index.md` entfernen.
4. `photos:`/`clips:` in `index.md` ergänzen. Neutrale Texte neu durchzählen (`Foto N von M`,
   `Video N`, M = neue Gesamtzahl). Titelbild bleibt `photos[0]`, außer der Autor nennt ein neues.
5. Die Lern-Datei bleibt **unverändert** (Medien stehen nicht darin).

**Text geändert:**

1. Neuen Text aus dem Text-Doc byte-genau nach `original.md`, Segmente und Hash in `index.md`
   anpassen (Regeln „Beitragsformat“ und „Übersetzungsregeln“). Nur geänderte Stellen neu übersetzen.
2. **Lern-Datei neu aufbauen:** `Lernhilfe-<slug>` komplett aus dem neuen Text erzeugen (nicht nur
   anhängen, nicht die alte Fassung stehen lassen). Gibt es das Doc schon: neue Datei mit gleichem
   Titel anlegen, die alte mit `trash_file` in den Papierkorb legen, neuen Link nennen (Inhalt lässt sich
   nicht ersetzen, siehe „Spanisch-Lernhilfe“).
3. **Sammel-Doc `Lernhilfe-Übersicht` neu aufbauen:** Die Zählung dieses Beitrags **ersetzen**, nie
   zusätzlich addieren; Summen, Trend und Regelliste neu berechnen.
4. Haben sich nur `lang: de`-Passagen geändert, bleiben Lern-Datei und Übersicht unverändert.
   Kommen erstmals spanische Passagen dazu, die Lern-Datei neu anlegen; fallen alle weg, die Lern-Datei
   in den Papierkorb legen und die Übersicht neu aufbauen.

**Beides geändert:** erst Medien, dann Text. Am Ende melden, was sich geändert hat, und den Link zur
(neuen) Lern-Datei nennen, wenn sie neu aufgebaut wurde.

## Übersetzungsregeln

- Original **niemals** korrigieren, auch nicht in der Übersetzungskachel bei deutschen Passagen.
- Spanisch → gutes, natürliches Deutsch, sinngemäß (was der Autor meint), keine Wort-für-Wort-Übersetzung.
  Bei Fehlern im Spanisch die wahrscheinliche Absicht übersetzen. Ist sie unklar: nachfragen.
- Deutsche Passagen des Autors 1:1 übernehmen (Tippfehler bleiben).
- Reihenfolge wie im Original, keine farbliche Hervorhebung einzelner Passagen.
- Spanische Eigennamen bleiben (z. B. „Zócalo“), bekannte Orte dürfen deutsch heißen (Mexiko-Stadt).

## Spanisch-Lernhilfe (Lern-Datei in Google Drive)

Der Autor lernt Spanisch (Anfänger) und will aus seinen Fehlern lernen. Zu **jedem Beitrag mit
mindestens einem `lang: es`-Segment** entsteht deshalb eine Lern-Datei. Rein deutsche Beiträge: keine.
Die Lern-Datei liegt **nur in Google Drive**, nie im Repository und nie auf der Seite, und sie ändert
**nichts** am Original (`original.md` bleibt byte-genau, die Seite zeigt weiter seinen Text).

**Zeitpunkt:** wenn der Autor „fertig“ sagt (nicht nach jeder Überarbeitung). Ändert er den Text
nach dem Anlegen noch (siehe „Bestehenden Beitrag ändern“), die Lern-Datei **und** die Übersicht
neu aufbauen.

**Wo und wie:**

- **Je Beitrag:** Google Doc `Lernhilfe-<JJJJ-MM-TT-slug>` im Drive-Unterordner des Beitrags (neben dem
  Text-Doc). Nicht freigeben (gehört dem Autor). Ablauf (am 24.11.2026 mit Beitrag 1 geprüft):
  1. Den Inhalt als HTML-Datei im Scratchpad schreiben (`<h1>`, `<h2>`, `<h3>`, `<p>`, `<ul>`,
     `<table border="1">`, `<b>`, `<i>`), nicht in den Chat tippen.
  2. `sha256sum` der Datei bilden und `create_file` mit `contentMimeType: text/html`,
     `parentId` = Unterordner und `base64Content: sha256:<hash>:<absoluter Pfad>` aufrufen. Drive
     wandelt das in ein Google Doc um (Überschriften, Tabellen, Fett, Kursiv und Emoji kommen an).
  3. Mit `read_file_content` (`includeComments: true`) prüfen, dass der Text vollständig ist.
     (`fileSize: "1"` in der Antwort ist normal.)
  Vorher den Skill `anthropic-skills:google-workspace` lesen.
- **Ändern geht nur über eine neue Datei:** Es gibt keinen Docs-Editor-Konnektor, und `update_file` ändert
  nur Metadaten (Titel, Ordner), nie den Inhalt (geprüft). Also: neues Doc mit **gleichem Titel**
  anlegen, das alte mit `trash_file` in den Papierkorb legen (nur eigene `Lernhilfe-*`-Docs, nie
  andere Dateien), den neuen Link nennen und die Links in der Übersicht aktualisieren. Dem Autor
  sagen, dass im Papierkorb ein altes `Lernhilfe-*` liegt (er kann es dort lassen).
- **Sammel-Doc:** Google Doc `Lernhilfe-Übersicht` im Hauptordner `reiseblog-viaje-mexico-guatemala`.
  Beim ersten Mal anlegen, danach nach jedem neuen Beitrag **neu aufbauen** (neue Datei, altes in den
  Papierkorb) aus dem alten Stand plus dem neuen Beitrag (Einzel-Docs per `search_files`:
  `title contains 'Lernhilfe-'`). Die Übersicht verlinkt die Einzel-Docs, also nach jedem
  Neuaufbau eines Einzel-Docs auch sie neu aufbauen.
- Die Lern-Datei liegt **im selben Ordner wie die Medien des Beitrags**. Sie ist nie ein Medium und nie
  der Beitragstext: Dateien mit `Lernhilfe-` am Anfang (und `tmp-*`) beim „Medien holen“ und bei jeder
  Änderung eines Beitrags ignorieren (siehe „Bestehenden Beitrag ändern“).

**Inhalt der Lern-Datei je Beitrag** (Deutsch, einfach, am Handy lesbar, Fachbegriffe kurz erklärt;
Niveau Anfänger, A1 bis A2):

1. **Kurzfazit:** Anzahl der Fehler, die ein bis drei häufigsten Themen und **zuerst etwas, das gut
   gelungen ist** (konkret, nicht pauschal).
2. **Korrigierte Fassung:** die spanischen Passagen vollständig, korrigierte Stellen **fett**. Deutsche
   Passagen weglassen.
3. **Fehler im Detail:** je Fehler ein Block: Original → korrigiert, **Kategorie**, kurze Erklärung
   „Warum?“ mit der Regel, zwei eigene Beispielsätze, ein Merksatz. Gleiche Fehler zusammenfassen
   (einmal erklären, alle Fundstellen nennen).
4. **Natürlicher klingen:** Stilvorschläge, **klar von Fehlern getrennt** („so ist es nicht falsch, aber
   Muttersprachler sagen eher …“).
5. **Grammatik zum Nachlesen:** nur Regeln, die im Beitrag vorkamen, mit Beispielen; bei Verben eine
   kleine Tabelle der Formen (z. B. Pretérito indefinido von `llegar`).

**Kategorien** (immer genau diese, damit die Übersicht zählen kann): Akzente und Schreibung,
Artikel und Geschlecht, Zahl und Übereinstimmung (Adjektiv, Verb), Verbformen und Zeiten,
`ser`/`estar` (inkl. `hay`), Präpositionen, Wortschatz und falsche Freunde, Wortstellung,
Satzzeichen (ohne `¿ ¡`), Sonstiges.

**Inhalt des Sammel-Docs `Lernhilfe-Übersicht`:** Tabelle je Kategorie mit Anzahl der Fehler pro
Beitrag und insgesamt (Trend: wird es besser?), die drei Themen, die aktuell am meisten Übung
brauchen, eine Liste der **Regeln, die der Autor schon einmal falsch hatte** (Kurzregel plus Link zum
Beitrag), Verlauf der Beiträge (Datum, Link zur Lern-Datei).

**Regeln:**

- Nur **sichere** Korrekturen. Ist die Absicht unklar, die Annahme kenntlich machen oder beim
  Autor nachfragen (wie bei der Übersetzung). Nichts erfinden.
- **`¿` und `¡` am Anfang** (Wunsch des Autors: Er kennt die Regel und lässt die Zeichen aus Bequemlichkeit
  weg): In der **korrigierten Fassung** setzen, richtig und **unmarkiert** (nicht fett). Sonst **nie
  erwähnen**: nicht als Fehler auflisten, nicht zählen (auch nicht in der Übersicht), nicht erklären, nicht
  loben, wenn er sie gesetzt hat. Andere Satzzeichen (z. B. Komma bei der Anrede) zählen weiter.
- Bei Auslassungen im Original (Akzente, Großschreibung) den Fehler zählen, aber freundlich bleiben:
  Es ist ein Lernwerkzeug, kein Zeugnis.
- Die Lern-Datei bespricht **nur den Text**, nie Fotos, Videos oder Orte (Regel „Medien nicht
  inhaltlich auswerten“).
- Nichts aus der Lern-Datei in Pull-Requests, Commit-Nachrichten oder Beschreibungen übernehmen
  (privat). In die Abschlussmeldung nur den Link und ein bis zwei Themen.

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
- **Medien nicht inhaltlich auswerten (Wunsch des Autors):** Fotos, Videos und Bewegtfotos werden
  **nicht** angesehen, analysiert oder beschrieben: nicht, was zu sehen ist, wer oder was abgebildet
  ist, wo es aufgenommen wurde, nicht in Texten, im Chat oder in Pull-Requests. Dafür keine
  Bilddatei öffnen (kein `Read` auf Bilder, keine Bildbetrachter, keine Video-Einzelbilder ansehen).
  `alt` und `title` bekommen die neutralen Standardtexte (`Foto N von M`, `Video N`); eine echte
  Beschreibung nur, wenn der Autor sie selbst liefert (z. B. im Google Doc). Der Ort kommt aus dem
  Text, das Titelbild nennt der Autor mit Dateinamen. Der Drive-Konnektor zeigt heruntergeladene
  Bilder von selbst im Chat an; das lässt sich nicht abstellen, davon wird nichts verwendet.
  Technische Prüfungen (Größe, Format, Metadaten, Laufzeit, Layout per Screenshot) bleiben erlaubt.
- **Videos:** Eigene Videos kommen als `clips:` ins Repository, aber **nur nach dem Import** (720p,
  H.264/AAC, mit Ton, ohne Standort, höchstens 180 s und 40 MiB je Clip). Die Seite liefert sie
  selbst aus und lädt sie erst nach dem Antippen von „Play“. YouTube wird nicht verwendet (der
  Autor will seine Videos selbst über Google Drive liefern); `videos:` im Frontmatter ist ein Fehler.
- **Platz:** GitHub Pages erlaubt 1 GB. Der Build warnt ab 700 MiB und bricht ab 900 MiB ab. Bei der
  Warnung dem Autor Bescheid geben (Optionen: weniger oder kürzere Clips, Videos in ein zweites
  Pages-Repository auslagern).

## Medien holen (Quelle der Originale)

Die Originale liegen im Google Drive des Autors: Ordner `reiseblog-viaje-mexico-guatemala`
(ID `1Qu7wqLXW14XaZgrblZB4PZW2PaHg5b3M`), darin **ein Unterordner je Beitrag** `JJJJ-MM-TT-slug` mit
einem Google Doc (Text, Hinweis auf das Titelbild), den Fotos, Videos und Bewegtfotos (`*.MP.jpg`).
Der Autor meldet nur: „Neuer Beitrag `JJJJ-MM-TT-slug`“. Zugriff über den Drive-Konnektor
(`mcp__Google_Drive__*`, per ToolSearch laden). Ist ein Anhang im Chat, hat er Vorrang (liegt schon
im Arbeitsordner).

1. **Unterordner und Dateien finden:** `search_files` mit `parentId = '<ordner-id>' and trashed = false`
   (erst den Unterordner, dann dessen Inhalt). Eine Antwort kann leer sein und nur `nextPageToken`
   enthalten: dann die nächste Seite mit dem Token holen. Sieht der Konnektor nichts, obwohl der
   Autor Dateien hochgeladen hat: Konnektor-Berechtigung prüfen lassen (er sah anfangs nur Dateien,
   die er selbst angelegt hatte).
2. **Text:** `download_file_content` mit `exportMimeType: text/plain` (oder `read_file_content`).
   Text so übernehmen, wie das Doc ihn liefert (nur Export-Artefakte wie BOM entfernen), nie
   korrigieren. Titel und Titelbild stehen im Doc; ist etwas unklar, den Autor fragen.
3. **Dateien bis 10 MB:** `download_file_content`. Die Datei wird automatisch im Ordner
   `…/tool-results/` gespeichert (Pfad steht in der Antwort; Bilder werden zusätzlich angezeigt).
   Größe mit `fileSize` aus der Suche vergleichen. Dateien nie von Hand abtippen oder einfügen.
4. **Dateien über 10 MB (Grenze des Konnektors, meist Videos):** nie das Original freigeben, sondern
   eine **Kopie** nutzen und sofort aufräumen:
   1. `copy_file` (`title: tmp-<name>`, `parentId` = derselbe Unterordner)
   2. `share_file` (`role: reader`, `permissionId: anyoneWithLink`) nur für die Kopie
   3. `curl -L -o <ziel> "https://drive.usercontent.google.com/download?id=<kopie-id>&export=download&confirm=t"`
   4. Größe der Datei mit `fileSize` vergleichen (bei Abweichung ist es eine HTML-Fehlerseite) und
      sofort danach `update_file` mit `downloadRestriction: {restrictedReader: true}` (sperrt den
      Download), dann `trash_file`. Auch bei Fehlern **immer** sperren und in den Papierkorb legen.
   Der Papierkorb allein beendet den Link **nicht** (geprüft); erst die Download-Sperre tut es.
   Freigaben lassen sich mit den Werkzeugen nicht zurücknehmen. Am Ende dem Autor sagen:
   „Bitte im Drive-Papierkorb die `tmp-*`-Dateien endgültig löschen.“
5. Alle Dateien in einen neuen, leeren Ordner **außerhalb von `content/`** legen (z. B.
   `<scratchpad>/<slug>/`) und dann importieren (Ablauf, Schritt 6). Originale nie einchecken.

Alternativen, falls der Konnektor fehlt: geteilter Ordner-Link („Jeder mit dem Link“); `drive.google.com`
und `drive.usercontent.google.com` müssen im Netzwerk der Umgebung erlaubt sein (`read_documentation`,
Thema `environment.network`).

Das **Titelbild** ist das erste Foto im Beitrag (`photos[0]`; auch Vorschaubild und WhatsApp-Bild).
Der Import nummeriert nach Dateiname; das Titelbild des Autors deshalb in `index.md` an die erste
Stelle von `photos:` setzen (Dateien nicht umbenennen).

**Skill:** Für den ganzen Ablauf gibt es den Skill `neuer-beitrag` (`.claude/skills/neuer-beitrag/`).
Er ist nur eine Kurzfassung; maßgeblich ist diese Datei.

## Kartenregeln

- Die Karte kennt **Orte**, nicht Beiträge. Quelle: `content/places.yaml`.
- Reihenfolge der Einträge = Reiseverlauf. Nummern zählen die Orte (1, 2, 3 …), nicht die Beiträge.
- Der **letzte** Eintrag ist der aktuelle Ort („Aquí estoy“).
- Ein neuer Ort wird **nur** eingetragen, wenn der Autor sagt, dass er dort war (oder es eindeutig
  aus dem Beitragstext hervorgeht, nie aus Fotos oder Videos). **Im Zweifel fragen, nie raten.**
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
- Die Lern-Datei (Korrekturen, Fehleranalyse) ins Repository, in die Seite oder in Pull-Requests legen.
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
