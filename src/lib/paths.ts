/**
 * Hilfen für Pfade mit konfigurierbarem Basispfad.
 * Die Seite läuft unter "/" und unter Vorschau-Pfaden wie "/pr-preview/pr-12/".
 */

/** Normalisiert einen Basispfad auf die Form "/…/" (immer mit führendem und abschließendem Slash). */
export function normalizeBase(base: string | undefined): string {
  let b = (base ?? '/').trim();
  if (!b.startsWith('/')) b = '/' + b;
  if (!b.endsWith('/')) b += '/';
  return b.replace(/\/{2,}/g, '/');
}

/** Hängt einen relativen Pfad an den Basispfad an: withBase('/x/', 'entradas/a/') → '/x/entradas/a/'. */
export function withBase(base: string, path = ''): string {
  const b = normalizeBase(base);
  const p = path.replace(/^\/+/, '');
  return b + p;
}

/** Absolute URL (für Open Graph), z. B. absoluteUrl('https://a.de', '/x/', 'media/a.jpg'). */
export function absoluteUrl(site: string, base: string, path = ''): string {
  return new URL(withBase(base, path), site.endsWith('/') ? site : site + '/').toString();
}

/** true, wenn der Basispfad eine PR-Vorschau ist. */
export function isPreviewBase(base: string): boolean {
  return /\/pr-preview\//.test(normalizeBase(base));
}
