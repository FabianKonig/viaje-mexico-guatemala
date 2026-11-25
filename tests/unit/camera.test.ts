import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { renderPhoto, inspectImage, verifyDir } from '../../scripts/images.mjs';
import { shrinkPhoto } from '../../scripts/lib/import.mjs';
import {
  cameraLine,
  cameraName,
  cameraToSharpExif,
  exifProblems,
  readCamera,
} from '../../scripts/lib/camera.mjs';
import { exifHasGps } from '../../scripts/lib/exif.mjs';

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));

/** Handyfoto mit allen Kameraangaben und allem, was NICHT erhalten bleiben darf (Testwerte). */
async function phoneJpeg(width = 3000, height = 2000) {
  return sharp({ create: { width, height, channels: 3, background: '#0e7c86' } })
    .jpeg()
    .withExif({
      IFD0: {
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        Artist: 'Test Person',
        Copyright: 'Test',
        Software: '26.1',
        ImageDescription: 'Testbeschreibung',
      },
      IFD2: {
        ExposureTime: '1/120',
        FNumber: '178/100',
        ExposureProgram: '2',
        ISOSpeedRatings: '80',
        DateTimeOriginal: '2026:11:24 19:42:10',
        ExposureBiasValue: '0/1',
        MeteringMode: '5',
        Flash: '16',
        FocalLength: '6765/1000',
        WhiteBalance: '0',
        FocalLengthIn35mmFilm: '24',
        LensMake: 'Apple',
        LensModel: 'iPhone 15 Pro back triple camera 6.765mm f/1.78',
        BodySerialNumber: 'GEHEIM-123',
        CameraOwnerName: 'Test Person',
        UserComment: 'ASCII\0\0\0Kommentar',
      },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '1/1 0/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '1/1 0/1 0/1',
      },
    })
    .toBuffer();
}

describe('Kameraangaben lesen und schreiben', () => {
  it('Testfoto enthält wirklich GPS, Seriennummer und Besitzer (Gegenprobe)', async () => {
    const exif = (await sharp(await phoneJpeg()).metadata()).exif!;
    expect(exifHasGps(exif)).toBe(true);
    expect(exif.includes(Buffer.from('GEHEIM-123'))).toBe(true);
    expect(exifProblems(exif).join()).toMatch(/GPS/);
  });

  it('Import behält nur die erlaubten Angaben, nichts anderes', async () => {
    const out = await shrinkPhoto(await phoneJpeg());
    const exif = (await sharp(out.data).metadata()).exif!;
    expect(exifProblems(exif)).toEqual([]);
    expect(exifHasGps(exif)).toBe(false);
    for (const secret of ['GEHEIM-123', 'Test Person', 'Testbeschreibung', 'Kommentar', '26.1'])
      expect(out.data.includes(Buffer.from(secret)), secret).toBe(false);
    const c = readCamera(exif);
    expect(c).toMatchObject({
      make: 'Apple',
      model: 'iPhone 15 Pro',
      lensModel: 'iPhone 15 Pro back triple camera 6.765mm f/1.78',
      iso: 80,
      focalLength35: 24,
      exposureProgram: 2,
      meteringMode: 5,
      flash: 16,
      whiteBalance: 0,
      dateTimeOriginal: '2026:11:24 19:42:10',
    });
    expect(c.exposureTime.n).toBeCloseTo(1 / 120);
    expect(c.fNumber.n).toBeCloseTo(1.78);
    expect(c.focalLength.n).toBeCloseTo(6.765);
    expect(c.exposureBias.n).toBe(0);
  });

  it('Werte bleiben beim erneuten Verarbeiten (Build) unverändert', async () => {
    const first = await shrinkPhoto(await phoneJpeg());
    const second = await renderPhoto(first.data);
    const a = readCamera((await sharp(first.data).metadata()).exif);
    const b = readCamera((await sharp(second.large.data).metadata()).exif);
    expect(b).toEqual(a);
    expect(second.info).toBe(cameraLine(a));
    // Vorschaubilder bleiben ohne jede Metadaten
    expect((await sharp(second.thumbs[400].data).metadata()).exif).toBeUndefined();
    expect((await sharp(second.thumbs[800].data).metadata()).exif).toBeUndefined();
  });

  it('Foto ohne Kameraangaben bleibt ohne Metadaten, Textzeile leer', async () => {
    const plain = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#fff' },
    })
      .jpeg()
      .toBuffer();
    const out = await shrinkPhoto(plain);
    expect((await sharp(out.data).metadata()).exif).toBeUndefined();
    const r = await renderPhoto(out.data);
    expect(r.info).toBe('');
    expect((await sharp(r.large.data).metadata()).exif).toBeUndefined();
    expect(readCamera(undefined)).toBeNull();
    expect(cameraToSharpExif(null)).toEqual({});
  });

  it('Prüfung: Kameraangaben nur im großen Bild und im Import-Foto erlaubt', async () => {
    const dir = tmp('cam-');
    const r = await renderPhoto(await phoneJpeg(800, 600));
    fs.writeFileSync(path.join(dir, '01-abc-1600.webp'), r.large.data);
    await expect(verifyDir(dir)).resolves.toBe(1);
    // dasselbe Bild als Vorschau: nicht erlaubt
    fs.writeFileSync(path.join(dir, '01-abc-400.webp'), r.large.data);
    await expect(verifyDir(dir)).rejects.toThrow(/EXIF/);
    fs.rmSync(path.join(dir, '01-abc-400.webp'));
    // Seriennummer im großen Bild: nicht erlaubt
    const bad = await sharp(r.large.data)
      .withExifMerge({ IFD2: { BodySerialNumber: 'GEHEIM-123' } })
      .toBuffer();
    fs.writeFileSync(path.join(dir, '02-abc-1600.webp'), bad);
    await expect(verifyDir(dir)).rejects.toThrow(/EXIF-Tag/);
    const file = path.join(dir, 'x.jpg');
    fs.writeFileSync(file, await phoneJpeg(400, 300));
    expect(await inspectImage(file, { camera: true })).toEqual(
      expect.arrayContaining(['EXIF mit GPS']),
    );
  });
});

describe('Textzeile für die Großansicht', () => {
  const c = (o: object) => o as never;
  const full = {
    make: 'Apple',
    model: 'iPhone 15 Pro',
    lensModel: 'iPhone 15 Pro back triple camera 6.765mm f/1.78',
    fNumber: { n: 1.78 },
    exposureTime: { n: 1 / 120 },
    iso: 80,
    focalLength: { n: 6.765 },
    focalLength35: 24,
  };

  it('feste Reihenfolge, Mittelpunkt als Trenner', () => {
    expect(cameraLine(c(full))).toBe(
      'Apple iPhone 15 Pro · iPhone 15 Pro back triple camera 6.765mm f/1.78 · f/1,8 · 1/120 s · ISO 80 · 6,8 mm (24 mm KB)',
    );
  });

  it('fehlende Angaben entfallen, die Reihenfolge bleibt', () => {
    expect(cameraLine(c({ ...full, lensModel: undefined }))).toBe(
      'Apple iPhone 15 Pro · f/1,8 · 1/120 s · ISO 80 · 6,8 mm (24 mm KB)',
    );
    expect(cameraLine(c({ model: 'Pixel 8', iso: 200, focalLength: { n: 6.9 } }))).toBe(
      'Pixel 8 · ISO 200 · 6,9 mm',
    );
    expect(cameraLine(c({ fNumber: { n: 2 }, focalLength35: 35 }))).toBe('f/2 · 35 mm KB');
    expect(cameraLine(c({ dateTimeOriginal: '2026:11:24 19:42:10', flash: 1 }))).toBe('');
    expect(cameraLine(null)).toBe('');
  });

  it('Brennweite: Kleinbild nur in Klammern, wenn es sich unterscheidet', () => {
    expect(cameraLine(c({ focalLength: { n: 50 }, focalLength35: 50 }))).toBe('50 mm');
    expect(cameraLine(c({ focalLength: { n: 35 }, focalLength35: 52 }))).toBe('35 mm (52 mm KB)');
  });

  it('Verschlusszeit: Bruchteile und ganze Sekunden', () => {
    expect(cameraLine(c({ exposureTime: { n: 0.004 } }))).toBe('1/250 s');
    expect(cameraLine(c({ exposureTime: { n: 1 } }))).toBe('1 s');
    expect(cameraLine(c({ exposureTime: { n: 2.5 } }))).toBe('2,5 s');
  });

  it('Kameraname: keine Doppelung, saubere Schreibweise', () => {
    expect(cameraName(c({ make: 'Canon', model: 'Canon EOS R5' }))).toBe('Canon EOS R5');
    expect(cameraName(c({ make: 'NIKON CORPORATION', model: 'NIKON Z 6' }))).toBe('NIKON Z 6');
    expect(cameraName(c({ make: 'SONY', model: 'ILCE-7M3' }))).toBe('Sony ILCE-7M3');
    expect(cameraName(c({ make: 'samsung', model: 'SM-S918B' }))).toBe('Samsung SM-S918B');
    expect(cameraName(c({ make: 'Google', model: 'Pixel 8 Pro' }))).toBe('Google Pixel 8 Pro');
    expect(cameraName(c({ model: 'Pixel 8' }))).toBe('Pixel 8');
    expect(cameraName(c({ make: 'Fuji' }))).toBe('Fuji');
  });
});
