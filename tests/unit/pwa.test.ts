import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';
import {
  cachePrefix,
  cachesToDelete,
  manifest,
  serviceWorkerEnabled,
  shouldHandle,
} from '../../src/lib/pwa';

describe('PWA', () => {
  it('Cache-Namen sind pro Basispfad getrennt', () => {
    expect(cachePrefix('/')).toBe('viaje:/:');
    expect(cachePrefix('/pr-preview/pr-3/')).toBe('viaje:/pr-preview/pr-3/:');
  });

  it('Update-Logik: löscht nur alte Caches desselben Basispfads', () => {
    const keys = [
      'viaje:/:pages-alt',
      'viaje:/:assets-alt',
      'viaje:/:pages-neu',
      'viaje:/:assets-neu',
      'viaje:/pr-preview/pr-3/:pages-x',
      'fremd',
    ];
    expect(cachesToDelete(keys, 'viaje:/:', ['viaje:/:pages-neu', 'viaje:/:assets-neu'])).toEqual([
      'viaje:/:pages-alt',
      'viaje:/:assets-alt',
    ]);
  });

  it('bearbeitet nur eigene GET-Anfragen im Scope, nie Vorschauen', () => {
    const scope = 'https://viaje.fabiankonig.de/';
    expect(shouldHandle('https://viaje.fabiankonig.de/entradas/a/', 'GET', scope)).toBe(true);
    expect(shouldHandle('https://viaje.fabiankonig.de/entradas/a/', 'POST', scope)).toBe(false);
    expect(shouldHandle('https://palabrita.fabiankonig.de/', 'GET', scope)).toBe(false);
    expect(shouldHandle('https://viaje.fabiankonig.de/pr-preview/pr-2/', 'GET', scope)).toBe(false);
    expect(
      shouldHandle(
        'https://viaje.fabiankonig.de/pr-preview/pr-2/x/',
        'GET',
        'https://viaje.fabiankonig.de/pr-preview/pr-2/',
      ),
    ).toBe(true);
    expect(
      shouldHandle(
        'https://viaje.fabiankonig.de/x/',
        'GET',
        'https://viaje.fabiankonig.de/pr-preview/pr-2/',
      ),
    ).toBe(false);
  });

  it('kein Service Worker in Vorschauen', () => {
    expect(serviceWorkerEnabled('/', undefined)).toBe(true);
    expect(serviceWorkerEnabled('/', 'true')).toBe(false);
    expect(serviceWorkerEnabled('/pr-preview/pr-1/', undefined)).toBe(false);
  });

  it('Manifest mit relativen Pfaden und Icons in den richtigen Größen', async () => {
    const m = manifest();
    expect(m.name).toBe('Un viaje a México y Guatemala');
    expect(m.short_name.length).toBeLessThanOrEqual(12);
    expect(m.start_url).toBe('./');
    expect(m.theme_color).toBe('#F6EBD9');
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of [...m.icons, { src: 'icons/apple-touch-icon.png', sizes: '180x180' }]) {
      expect(icon.src.startsWith('/')).toBe(false);
      const meta = await sharp(fs.readFileSync('public/' + icon.src)).metadata();
      expect(`${meta.width}x${meta.height}`).toBe(icon.sizes);
      expect(meta.exif).toBeUndefined();
    }
  });
});
