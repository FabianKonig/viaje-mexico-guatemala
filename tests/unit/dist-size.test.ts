import { describe, expect, it } from 'vitest';
import { DIST_MAX, DIST_WARN, distSizeStatus } from '../../scripts/check-dist.mjs';

describe('Größe der veröffentlichten Seite', () => {
  it('Warnung ab 700 MiB, Fehler ab 900 MiB (GitHub Pages: 1 GB)', () => {
    expect(DIST_WARN).toBe(700 * 1024 * 1024);
    expect(DIST_MAX).toBe(900 * 1024 * 1024);
    expect(distSizeStatus(0)).toBe('ok');
    expect(distSizeStatus(DIST_WARN)).toBe('ok');
    expect(distSizeStatus(DIST_WARN + 1)).toBe('warn');
    expect(distSizeStatus(DIST_MAX)).toBe('warn');
    expect(distSizeStatus(DIST_MAX + 1)).toBe('fail');
  });
});
