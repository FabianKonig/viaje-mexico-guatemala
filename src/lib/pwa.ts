/**
 * PWA-Hilfen. Die Funktionen hier werden 1:1 in den Service Worker eingebettet (Function.toString),
 * deshalb ohne Importe und ohne TypeScript-Syntax im Funktionsrumpf.
 */
import { SITE } from '../config';
import { isPreviewBase } from './paths';

/** Präfix aller Caches eines Basispfads, z. B. "viaje:/:" oder "viaje:/pr-preview/pr-3/:". */
export function cachePrefix(scopePath: string): string {
  return 'viaje:' + scopePath + ':';
}

/** Welche Caches beim Aktivieren gelöscht werden: nur eigene (gleicher Basispfad) mit alter Version. */
export function cachesToDelete(keys: string[], prefix: string, current: string[]): string[] {
  return keys.filter(function (k) {
    return k.indexOf(prefix) === 0 && current.indexOf(k) === -1;
  });
}

/** Soll der Service Worker diese Anfrage bearbeiten? (gleicher Ursprung, im Scope, keine Vorschau eines anderen Basispfads) */
export function shouldHandle(url: string, method: string, scope: string): boolean {
  if (method !== 'GET') return false;
  const u = new URL(url);
  // Videos nie über den Service Worker: Sie werden gestreamt (Range-Anfragen) und nie vorab geladen.
  if (/\.(mp4|m4v|webm|mov)$/i.test(u.pathname)) return false;
  const s = new URL(scope);
  if (u.origin !== s.origin) return false;
  if (u.pathname.indexOf(s.pathname) !== 0) return false;
  // Der Haupt-Service-Worker ("/") lässt Vorschauen unter /pr-preview/ in Ruhe.
  if (s.pathname === '/' && u.pathname.indexOf('/pr-preview/') === 0) return false;
  return true;
}

/** Ist ein Service Worker in diesem Build erlaubt? (nie in Vorschauen) */
export function serviceWorkerEnabled(base: string, previewFlag: string | undefined): boolean {
  return previewFlag !== 'true' && !isPreviewBase(base);
}

/** Inhalt des Web-App-Manifests. Alle Pfade relativ zum Manifest (funktioniert unter jedem Basispfad). */
export function manifest() {
  return {
    name: SITE.title,
    short_name: SITE.shortTitle,
    description: SITE.description,
    lang: 'de',
    dir: 'ltr',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F6EBD9',
    theme_color: '#F6EBD9',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
