/**
 * Entscheidet anhand der geänderten Dateien, wie viel die CI im Pull-Request testen muss.
 *
 *  docs     nur Dokumente im Hauptordner (SPEC.md, TODO.md, README.md, AGENTS.md, ...)
 *           → Lint + Unit-Tests (kein Build, keine Browser)
 *  content  nur Inhalt unter content/ (Beiträge, Fotos, Ortsliste) und/oder Dokumente
 *           → zusätzlich Build und Browser-Tests nur in Chromium
 *  full     alles andere (Code, Layout, Skripte, Tests, Abhängigkeiten, Workflows, ...)
 *           → voller Lauf mit allen Browsern
 *
 * Im Zweifel immer `full`: Jede Datei, die hier nicht ausdrücklich als harmlos gilt, löst den
 * vollen Lauf aus.
 */
export const SCOPES = ['docs', 'content', 'full'];

/** Dokument im Hauptordner (keine Unterordner), z. B. SPEC.md. */
export function isDoc(file) {
  return /^[^/]+\.md$/.test(file);
}

/** Inhalt der Reise: Beiträge, Fotos, Ortsliste, Profilfoto. */
export function isContent(file) {
  return file.startsWith('content/');
}

export function scopeFor(files) {
  const list = files.map((f) => f.trim()).filter(Boolean);
  if (list.every(isDoc)) return 'docs';
  if (list.every((f) => isDoc(f) || isContent(f))) return 'content';
  return 'full';
}
