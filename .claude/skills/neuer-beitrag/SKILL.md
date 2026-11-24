---
name: neuer-beitrag
description: >-
  Neuen Reiseblog-Beitrag aus einem Google-Drive-Unterordner anlegen (Google Doc mit Text, Fotos, Videos, Bewegtfotos): Text unverändert übernehmen und übersetzen, Medien importieren, Titelbild, Ort und Karte, Tests, Pull-Request. Verwenden, wenn der Autor einen neuen Beitrag meldet ("Neuer Beitrag 2026-…", "Ordner … ist fertig") oder fragt, wie ein Beitrag angelegt wird.
---

# Neuer Beitrag

Kurzfassung. **Maßgeblich ist `AGENTS.md`**, lies dort zuerst „Ablauf: neuen Beitrag anlegen“,
„Medien holen“, „Übersetzungsregeln“, „Spanisch-Lernhilfe“, „Bestehenden Beitrag ändern“, „Fotoregeln“ und „Kartenregeln“. Bei Widerspruch gilt AGENTS.md.

Der Autor steuert vom Handy: Rückmeldungen kurz, am Ende nennen, was fertig ist und was er noch tun muss.

## Ablauf

1. **Branch** `post/<JJJJ-MM-TT-slug>` von aktuellem `main`. Der Slug ist der Name des Drive-Unterordners.
2. **Drive-Unterordner lesen** (Konnektor `mcp__Google_Drive__*`, vorher per ToolSearch laden): Ordner
   `reiseblog-viaje-mexico-guatemala`, Unterordner = Beitrag. Doc als Text, Fotos und Videos
   herunterladen. **Über 10 MB:** nur über eine Kopie (`copy_file`, `share_file`, `curl`, dann
   Download sperren und in den Papierkorb), nie das Original freigeben. Rezept: AGENTS.md › Medien holen.
3. **Text** unverändert nach `original.md` (nie korrigieren), Hash mit `node scripts/hash-original.mjs`.
4. **Übersetzen** (Spanisch → natürliches Deutsch, Deutsches 1:1), Segmente in `index.md`.
5. **Medien importieren:** Dateien in einen leeren Ordner **außerhalb** von `content/`, dann
   `node scripts/import-media.mjs <ordner> <slug>`. Danach `photos:` (`alt: 'Foto N von M'`) und `clips:` (`title: 'Video N'`) in `index.md` eintragen, genau wie das
   Skript es vorschlägt (streng nach Aufnahmezeit); das Titelbild des Autors als `cover: <datei>` eintragen (ohne Angabe gilt das erste Foto). **Medien nicht ansehen und nicht beschreiben.** Originale nie einchecken.
6. **Ort:** nur eintragen, wenn er aus dem **Text** eindeutig ist (nie aus Fotos oder Videos); sonst den Autor fragen, nie raten (`content/places.yaml`).
7. **Prüfen:** `npm run test:unit`, einmal bauen (`npm run build`), Screenshots Handy (390 px) und
   Computer nur zur Layoutprüfung ansehen.
8. **Pull-Request** öffnen, nur wenn der Autor es verlangt oder „fertig“ sagt. Beschreibung kurz:
   erkannte Sprachen, offene Fragen (Ort, Titel). Der Autor merged per „Squash and merge“.
9. **Lern-Datei** (nur bei spanischen Passagen, sobald der Autor „fertig“ sagt): Google Doc
   `Lernhilfe-<slug>` im Drive-Unterordner des Beitrags mit korrigierter Fassung, Fehlern samt
   Erklärung und Regel, Stilvorschlägen und Grammatik zum Nachlesen; danach das Sammel-Doc
   `Lernhilfe-Übersicht` im Hauptordner aktualisieren. Nur in Drive, nie ins Repository oder in den
   Pull-Request; im Chat nur Link und ein bis zwei Themen. Inhalt, Kategorien und Regeln: AGENTS.md
   › „Spanisch-Lernhilfe“. Das Original bleibt unverändert. **`¿ ¡` am Anfang** in der korrigierten Fassung still setzen (unmarkiert), sonst nie erwähnen, zählen oder erklären (Wunsch des Autors).
10. **Aufräumen melden:** Wenn Kopien in Drive angelegt wurden, dem Autor sagen, dass er im
   Drive-Papierkorb die `tmp-*`-Dateien endgültig löschen soll.

## Bestehenden Beitrag ändern

Meldet der Autor geänderte Medien („ein Foto dazu, zwei weg“) oder geänderten Text, gilt AGENTS.md
› „Bestehenden Beitrag ändern“. Kurz: Im Drive-Unterordner liegt auch die Lern-Datei
`Lernhilfe-<slug>`; Dateien mit `Lernhilfe-` oder `tmp-` am Anfang sind **nie** Medien oder Text, nicht
importieren, nicht als neu oder überzählig melden. Nur neue Medien importieren (Nummern laufen weiter),
entfernte löschen, `Foto N von M` neu durchzählen. **Text geändert und spanische Passagen betroffen:**
`Lernhilfe-<slug>` komplett neu aufbauen und `Lernhilfe-Übersicht` neu aufbauen (Zählung dieses Beitrags
ersetzen, nicht addieren). Bei Mehrdeutigkeit den Autor nach Dateinamen fragen.

## Nie

Fotos, Videos oder Bewegtfotos ansehen, analysieren oder beschreiben (Wunsch des Autors, siehe
AGENTS.md › Fotoregeln), das Spanisch oder Deutsch des Autors verbessern, Originalfotos oder Videos ohne den Import einchecken,
einen Ort raten, die Lern-Datei ins Repository legen, Originale in Drive freigeben, YouTube oder andere externe Dienste einbinden, direkt auf
`main` pushen.
