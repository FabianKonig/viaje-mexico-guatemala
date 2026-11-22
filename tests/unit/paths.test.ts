import { describe, expect, it } from 'vitest';
import { absoluteUrl, isPreviewBase, normalizeBase, withBase } from '../../src/lib/paths';

describe('Basispfad', () => {
  it('normalisiert Basispfade', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('/')).toBe('/');
    expect(normalizeBase('pr-preview/pr-1')).toBe('/pr-preview/pr-1/');
    expect(normalizeBase('/pr-preview/pr-1/')).toBe('/pr-preview/pr-1/');
    expect(normalizeBase('//a//b')).toBe('/a/b/');
  });

  it('hängt Pfade an', () => {
    expect(withBase('/', 'entradas/')).toBe('/entradas/');
    expect(withBase('/pr-preview/pr-1/', '/entradas/')).toBe('/pr-preview/pr-1/entradas/');
    expect(withBase('/pr-preview/pr-1/')).toBe('/pr-preview/pr-1/');
  });

  it('baut absolute URLs', () => {
    expect(absoluteUrl('https://viaje.fabiankonig.de', '/', 'media/a.jpg')).toBe(
      'https://viaje.fabiankonig.de/media/a.jpg',
    );
    expect(absoluteUrl('https://viaje.fabiankonig.de/', '/pr-preview/pr-3/', 'x/')).toBe(
      'https://viaje.fabiankonig.de/pr-preview/pr-3/x/',
    );
  });

  it('erkennt Vorschauen', () => {
    expect(isPreviewBase('/pr-preview/pr-7/')).toBe(true);
    expect(isPreviewBase('/')).toBe(false);
  });
});
