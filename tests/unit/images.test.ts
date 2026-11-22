import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  decodeInput,
  inspectImage,
  processAll,
  renderPhoto,
  verifyDir,
  LARGE,
} from '../../scripts/images.mjs';
import { exifHasGps } from '../../scripts/lib/exif.mjs';

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));

/** Testbild mit EXIF-GPS (Testwert 0°/0°) und Ausrichtung 6. */
async function gpsJpeg(width = 3000, height = 2000) {
  return sharp({ create: { width, height, channels: 3, background: '#c4552d' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestKamera' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '0/1 0/1 1/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '0/1 0/1 1/1',
      },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe('Bild-Pipeline', () => {
  it('Testbild enthält wirklich GPS (Gegenprobe)', async () => {
    const m = await sharp(await gpsJpeg()).metadata();
    expect(exifHasGps(m.exif)).toBe(true);
  });

  it('entfernt alle Metadaten, dreht nach Ausrichtung, hält 1600 px ein', async () => {
    const r = await renderPhoto(await gpsJpeg(), { og: true });
    // Ausrichtung 6 = 90° gedreht: aus 3000×2000 wird Hochformat
    expect(r.large.info.width).toBeLessThan(r.large.info.height);
    expect(Math.max(r.large.info.width, r.large.info.height)).toBe(LARGE);
    expect(r.thumbs[400].info.width).toBe(400);
    expect(r.thumbs[800].info.width).toBe(800);
    for (const buf of [r.large.data, r.thumbs[400].data, r.thumbs[800].data, r.og!]) {
      const m = await sharp(buf).metadata();
      expect(m.exif).toBeUndefined();
      expect(m.xmp).toBeUndefined();
      expect(m.iptc).toBeUndefined();
      expect(m.orientation).toBeUndefined();
    }
    const og = await sharp(r.og!).metadata();
    expect([og.format, og.width, og.height]).toEqual(['jpeg', 1200, 630]);
  });

  it('vergrößert kleine Bilder nicht', async () => {
    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#fff' },
    })
      .jpeg()
      .toBuffer();
    const r = await renderPhoto(small);
    expect(r.large.info.width).toBe(300);
    expect(r.thumbs[800].info.width).toBe(300);
  });

  it('verarbeitet HEIC', async () => {
    const input = await decodeInput('tests/fixtures/images/test-gps.heic');
    const r = await renderPhoto(input);
    expect(r.large.info.width).toBe(640);
    expect((await sharp(r.large.data).metadata()).exif).toBeUndefined();
  });

  it('Prüfung bricht bei GPS-Resten ab', async () => {
    const dir = tmp('verify-');
    fs.writeFileSync(
      path.join(dir, 'sauber.webp'),
      (await renderPhoto(await gpsJpeg(400, 300))).large.data,
    );
    await expect(verifyDir(dir)).resolves.toBe(1);
    fs.writeFileSync(path.join(dir, 'mit-gps.jpg'), await gpsJpeg(400, 300));
    expect(await inspectImage(path.join(dir, 'mit-gps.jpg'))).toContain('EXIF mit GPS');
    await expect(verifyDir(dir)).rejects.toThrow(/GPS/);
    fs.rmSync(path.join(dir, 'mit-gps.jpg'));
    fs.writeFileSync(path.join(dir, 'original.heic'), 'x');
    await expect(verifyDir(dir)).rejects.toThrow(/Originalformat/);
  });

  it('processAll: nur Fotos aus dem Frontmatter, ohne Metadaten, Manifest mit Maßen', async () => {
    const content = tmp('content-');
    const post = path.join(content, 'posts', '2026-11-24-test');
    fs.mkdirSync(path.join(post, 'photos'), { recursive: true });
    fs.writeFileSync(path.join(post, 'photos', 'a.jpg'), await gpsJpeg(2000, 1500));
    fs.copyFileSync('tests/fixtures/images/test-gps.heic', path.join(post, 'photos', 'b.heic'));
    fs.writeFileSync(path.join(post, 'photos', 'nicht-verwendet.jpg'), await gpsJpeg(500, 400));
    fs.writeFileSync(
      path.join(post, 'index.md'),
      '---\ntitle: T\nphotos:\n  - file: a.jpg\n    alt: A\n  - file: b.heic\n    alt: B\n---\n',
    );
    fs.writeFileSync(path.join(content, 'profile.jpg'), await gpsJpeg(600, 500));
    const out = tmp('out-');
    const cache = tmp('cache-');
    const manifest = await processAll({
      contentDir: content,
      outDir: out,
      cacheDir: cache,
      manifestFile: path.join(cache, 'm.json'),
      log: () => {},
    });
    expect(Object.keys(manifest.photos).sort()).toEqual([
      '2026-11-24-test/a.jpg',
      '2026-11-24-test/b.heic',
    ]);
    const a = manifest.photos['2026-11-24-test/a.jpg'];
    expect(a.og).toMatch(/\.jpg$/);
    expect(Math.max(a.width, a.height)).toBeLessThanOrEqual(LARGE);
    expect(manifest.profile).not.toBeNull();
    const files = fs.readdirSync(path.join(out, '2026-11-24-test'));
    expect(files.some((f) => f.includes('nicht-verwendet'))).toBe(false);
    expect(files.some((f) => /\.(heic|jpe?g)$/.test(f) && !f.endsWith('-og.jpg'))).toBe(false);
    await expect(verifyDir(out)).resolves.toBeGreaterThan(0);
    const prof = await sharp(path.join(out, path.basename(manifest.profile![152]))).metadata();
    expect([prof.width, prof.height]).toEqual([152, 152]);
  });
});
