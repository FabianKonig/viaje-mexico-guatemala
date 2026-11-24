import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import {
  containerCaptureTime,
  exifCaptureTime,
  filenameCaptureTime,
  formatCaptureTime,
  sortByCapture,
} from '../../scripts/lib/captured.mjs';
import { importMedia, listByCaptureTime } from '../../scripts/lib/import.mjs';
import { hasFfmpeg } from '../../scripts/lib/video.mjs';

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const ffmpeg = hasFfmpeg();

async function photo(file: string, taken?: string, sub?: string) {
  const img = sharp({
    create: { width: 64, height: 48, channels: 3, background: '#c4552d' },
  }).jpeg();
  await (
    taken
      ? img.withExif({
          IFD2: { DateTimeOriginal: taken, ...(sub ? { SubSecTimeOriginal: sub } : {}) },
        })
      : img
  ).toFile(file);
}

describe('Aufnahmezeit', () => {
  it('liest DateTimeOriginal und Sekundenbruchteile aus EXIF', async () => {
    const f = path.join(tmp('t-'), 'a.jpg');
    await photo(f, '2026:11:24 19:42:10', '37');
    const exif = (await sharp(f).metadata()).exif;
    expect(formatCaptureTime(exifCaptureTime(exif))).toBe('2026-11-24 19:42:10');
    expect(exifCaptureTime(exif)! % 1000).toBe(370);
    expect(exifCaptureTime(undefined)).toBeNull();
    expect(exifCaptureTime(Buffer.from('kein exif block hier'))).toBeNull();
  });

  it('erkennt Zeitstempel in Dateinamen', () => {
    const t = (n: string) => formatCaptureTime(filenameCaptureTime(n));
    expect(t('PXL_20261124_153012345.MP.jpg')).toBe('2026-11-24 15:30:12');
    expect(t('IMG_20261124_153012.jpg')).toBe('2026-11-24 15:30:12');
    expect(t('2026-11-24 15.30.12.jpg')).toBe('2026-11-24 15:30:12');
    expect(filenameCaptureTime('IMG_1234.jpg')).toBeNull();
    expect(filenameCaptureTime('foto.jpg')).toBeNull();
  });

  it('weist Platzhalterzeiten ab', () => {
    expect(containerCaptureTime('2026-11-24T19:42:10.000000Z')).not.toBeNull();
    expect(containerCaptureTime('1970-01-01T00:00:00.000000Z')).toBeNull();
    expect(containerCaptureTime('1904-01-01T00:00:00Z')).toBeNull();
    expect(containerCaptureTime(undefined)).toBeNull();
    expect(containerCaptureTime('Unsinn')).toBeNull();
  });

  it('sortiert nach Zeit, danach Dateiname; ohne Zeit am Ende', () => {
    const r = sortByCapture([
      { name: 'z.jpg', time: 1_700_000_000_000 },
      { name: 'x.jpg', time: null },
      { name: 'b.jpg', time: 1_800_000_000_000 },
      { name: 'a.jpg', time: 1_800_000_000_000 },
      { name: 'c.jpg', time: null },
    ]);
    expect(r.map((i) => i.name)).toEqual(['z.jpg', 'a.jpg', 'b.jpg', 'c.jpg', 'x.jpg']);
  });
});

describe('Import in Aufnahmereihenfolge', () => {
  it('Fotos: Reihenfolge nach EXIF-Zeit, nicht nach Dateiname', async () => {
    const source = tmp('quelle-');
    const postDir = path.join(tmp('post-'), '2026-11-25-test');
    await photo(path.join(source, 'a.jpg'), '2026:11:24 18:00:00');
    await photo(path.join(source, 'b.jpg'), '2026:11:24 09:00:00');
    await photo(path.join(source, 'c.jpg'), '2026:11:24 09:00:00', '5');
    await photo(path.join(source, 'd.jpg'));
    const r = await importMedia({ source, postDir, log: () => undefined });
    expect(r.photos.map((p: { source: string }) => p.source)).toEqual([
      'b.jpg',
      'c.jpg',
      'a.jpg',
      'd.jpg',
    ]);
    expect(r.photos.map((p: { file: string }) => p.file)).toEqual([
      '01.jpg',
      '02.jpg',
      '03.jpg',
      '04.jpg',
    ]);
  });

  it('Dateiname-Zeitstempel gilt, wenn EXIF fehlt', async () => {
    const source = tmp('quelle-');
    await photo(path.join(source, 'PXL_20261124_190000000.jpg'));
    await photo(path.join(source, 'PXL_20261124_080000000.jpg'));
    const list = await listByCaptureTime(source);
    expect(list.map((i: { name: string }) => i.name)).toEqual([
      'PXL_20261124_080000000.jpg',
      'PXL_20261124_190000000.jpg',
    ]);
  });

  it.skipIf(!ffmpeg)(
    'Videos: Reihenfolge nach Erstellungszeit; Fotos stehen vor Videos',
    async () => {
      const source = tmp('quelle-');
      const postDir = path.join(tmp('post-'), '2026-11-25-test');
      const video = (name: string, created: string) =>
        execFileSync(
          'ffmpeg',
          [
            ...[
              '-v',
              'error',
              '-y',
              '-f',
              'lavfi',
              '-i',
              'testsrc2=size=320x240:rate=15',
              '-t',
              '1',
            ],
            ...[
              '-c:v',
              'libx264',
              '-metadata',
              `creation_time=${created}`,
              path.join(source, name),
            ],
          ],
          { stdio: 'ignore' },
        );
      video('a.mp4', '2026-11-24T20:00:00Z');
      video('b.mp4', '2026-11-24T08:00:00Z');
      await photo(path.join(source, 'z.jpg'), '2026:11:24 12:00:00');
      const list = await listByCaptureTime(source);
      expect(list.map((i: { name: string }) => i.name)).toEqual(['z.jpg', 'b.mp4', 'a.mp4']);
      const r = await importMedia({ source, postDir, log: () => undefined });
      expect(r.clips.map((c: { source: string }) => c.source)).toEqual(['b.mp4', 'a.mp4']);
      expect(r.clips.map((c: { file: string }) => c.file)).toEqual(['01.mp4', '02.mp4']);
    },
  );
});
