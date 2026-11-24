import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { exifHasGps } from '../../scripts/lib/exif.mjs';
import { inspectImage } from '../../scripts/images.mjs';
import { frontmatterSnippet, importMedia, nextNumber } from '../../scripts/lib/import.mjs';
import {
  MAX_SHORT_SIDE,
  extractMotionVideo,
  ffmpegArgs,
  hasFfmpeg,
  mp4Problems,
  probeVideo,
  targetSize,
} from '../../scripts/lib/video.mjs';

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const ffmpeg = hasFfmpeg();

/** Testvideo mit Ton und Standort-Metadaten (Testwert, kein echter Ort). */
function makeVideo(file: string, size = '1920x1080', rate = 60) {
  execFileSync(
    'ffmpeg',
    [
      ...['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=${rate}`],
      ...['-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '2', '-c:v', 'libx264', '-c:a', 'aac'],
      ...['-metadata', 'location=+48.1351+011.5820/', file],
    ],
    { stdio: 'ignore' },
  );
}

describe('Videohilfen (ohne ffmpeg)', () => {
  it('Zielgröße: kürzere Seite höchstens 720 px, nie vergrößern, gerade Zahlen', () => {
    expect(targetSize(1920, 1080)).toEqual({ width: 1280, height: 720 });
    expect(targetSize(1080, 1920)).toEqual({ width: 720, height: 1280 });
    expect(targetSize(640, 360)).toEqual({ width: 640, height: 360 });
    expect(targetSize(3840, 2160)).toEqual({ width: 1280, height: 720 });
    for (const [w, h] of [
      [1921, 1081],
      [1000, 999],
    ]) {
      const t = targetSize(w, h);
      expect(t.width % 2).toBe(0);
      expect(t.height % 2).toBe(0);
      expect(Math.min(t.width, t.height)).toBeLessThanOrEqual(MAX_SHORT_SIDE);
    }
  });

  it('ffmpeg-Aufruf: ohne Metadaten, schneller Start, Ton nur wenn vorhanden, höchstens 30 fps', () => {
    const a = ffmpegArgs('in.mov', 'out.mp4', {
      width: 1920,
      height: 1080,
      fps: 60,
      hasAudio: true,
    });
    expect(a.join(' ')).toContain('-map_metadata -1');
    expect(a.join(' ')).toContain('-movflags +faststart');
    expect(a.join(' ')).toContain('scale=1280:720,fps=30');
    expect(a).toContain('aac');
    const b = ffmpegArgs('in.mov', 'out.mp4', {
      width: 640,
      height: 360,
      fps: 30,
      hasAudio: false,
    });
    expect(b).not.toContain('aac');
    expect(b.join(' ')).not.toContain('fps=');
  });

  it('erkennt Standort in MP4-Bytes', () => {
    const head = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from('ftypisom', 'latin1')]);
    const clean = Buffer.concat([head, Buffer.from('mdat....', 'latin1'), Buffer.alloc(32)]);
    expect(mp4Problems(clean)).toEqual([]);
    const withXyz = Buffer.concat([clean, Buffer.from([0xa9, 0x78, 0x79, 0x7a]), Buffer.alloc(8)]);
    expect(mp4Problems(withXyz).join()).toMatch(/©xyz/);
    const iso = Buffer.concat([clean, Buffer.from('+48.1351+011.5820/', 'latin1')]);
    expect(mp4Problems(iso).join()).toMatch(/GPS/);
    expect(mp4Problems(Buffer.from('kein video'))).toContain('keine MP4-Datei');
  });
});

describe.skipIf(!ffmpeg)('Import (mit ffmpeg)', () => {
  it('Video: 720p, ohne Standort, mit Ton, Standbild; Foto: 1600 px ohne GPS', async () => {
    const source = tmp('quelle-');
    const postDir = path.join(tmp('post-'), '2026-11-25-test');
    makeVideo(path.join(source, 'b-video.mp4'));
    await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#c4552d' } })
      .jpeg()
      .withExif({
        IFD0: { Make: 'TestKamera' },
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '1/1 0/1 0/1',
          GPSLongitudeRef: 'E',
          GPSLongitude: '1/1 0/1 0/1',
        },
      })
      .toFile(path.join(source, 'a-foto.jpg'));
    fs.writeFileSync(path.join(source, 'notiz.txt'), 'kein Medium');
    fs.writeFileSync(path.join(source, '.DS_Store'), 'x');
    // Gegenprobe: Quelle hat wirklich Standort
    expect(mp4Problems(fs.readFileSync(path.join(source, 'b-video.mp4'))).length).toBeGreaterThan(
      0,
    );
    expect(exifHasGps((await sharp(path.join(source, 'a-foto.jpg')).metadata()).exif)).toBe(true);

    const r = await importMedia({ source, postDir, log: () => undefined });
    expect(r.photos.map((p: { file: string }) => p.file)).toEqual(['01.jpg']);
    expect(r.clips.map((c: { file: string }) => c.file)).toEqual(['01.mp4']);
    expect(r.skipped.map((s: { source: string }) => s.source)).toEqual(['notiz.txt']);

    const photo = path.join(postDir, 'photos', '01.jpg');
    expect(await inspectImage(photo)).toEqual([]);
    const pm = await sharp(photo).metadata();
    expect(Math.max(pm.width!, pm.height!)).toBe(1600);

    const mp4 = path.join(postDir, 'clips', '01.mp4');
    expect(mp4Problems(fs.readFileSync(mp4))).toEqual([]);
    const info = probeVideo(mp4);
    expect([info.width, info.height]).toEqual([1280, 720]);
    expect(info.hasAudio).toBe(true);
    expect(info.fps).toBeLessThanOrEqual(30.5);
    expect(r.clips[0]).toMatchObject({ width: 1280, height: 720, hasAudio: true });
    expect(await inspectImage(path.join(postDir, 'clips', '01.jpg'))).toEqual([]);
  });

  it('Hochformat bleibt Hochformat, Video ohne Ton geht auch', async () => {
    const source = tmp('quelle-');
    const postDir = path.join(tmp('post-'), '2026-11-25-test');
    execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=1080x1920:rate=30',
        '-t',
        '1',
      ].concat(['-c:v', 'libx264', path.join(source, 'hoch.mp4')]),
      { stdio: 'ignore' },
    );
    const r = await importMedia({ source, postDir, log: () => undefined });
    expect(r.clips[0]).toMatchObject({ width: 720, height: 1280, hasAudio: false });
  });

  it('nummeriert fortlaufend weiter und überspringt zu lange Videos nicht still', async () => {
    const source = tmp('quelle-');
    const postDir = path.join(tmp('post-'), '2026-11-25-test');
    fs.mkdirSync(path.join(postDir, 'photos'), { recursive: true });
    fs.writeFileSync(path.join(postDir, 'photos', '07.jpg'), 'x');
    await sharp({ create: { width: 100, height: 100, channels: 3, background: '#fff' } })
      .png()
      .toFile(path.join(source, 'x.png'));
    const r = await importMedia({ source, postDir, log: () => undefined });
    expect(r.photos[0].file).toBe('08.jpg');
    expect(nextNumber(path.join(postDir, 'photos'))).toBe(9);
    expect(nextNumber(path.join(postDir, 'gibt-es-nicht'))).toBe(1);
  });

  it('Frontmatter-Vorschlag enthält Maße und Platzhalter', async () => {
    const snippet = frontmatterSnippet({
      photos: [{ source: 'a.jpg', file: '01.jpg' }],
      clips: [{ source: 'b.mp4', file: '01.mp4', width: 1280, height: 720, duration: 12.5 }],
    });
    // neutrale Standardtexte, keine inhaltliche Bildbeschreibung und kein Platzhalter
    expect(snippet).toContain("file: 01.jpg\n    alt: 'Foto 1 von 1'");
    expect(snippet).toContain("title: 'Video 1'");
    expect(snippet).not.toMatch(/TODO/);
    expect(snippet).toContain('width: 1280\n    height: 720\n    duration: 12.5');
  });
});

describe('Import ohne Quelle', () => {
  it('meldet einen fehlenden Quellordner', async () => {
    await expect(
      importMedia({ source: '/gibt/es/nicht', postDir: tmp('p-'), log: () => undefined }),
    ).rejects.toThrow(/nicht gefunden/);
  });
});

/** Synthetisches Android-Bewegtfoto: JPEG + XMP (Motion Photo) + angehängtes MP4. */
async function motionPhoto(file: string, videoFile: string) {
  const jpg = await sharp({
    create: { width: 800, height: 600, channels: 3, background: '#2f8f83' },
  })
    .jpeg()
    .withExif({
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '1/1 0/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '1/1 0/1 0/1',
      },
    })
    .toBuffer();
  execFileSync(
    'ffmpeg',
    [
      ...['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x480:rate=15', '-t', '1'],
    ].concat(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', videoFile]),
    { stdio: 'ignore' },
  );
  const mp4 = fs.readFileSync(videoFile);
  const xmp =
    '<x:xmpmeta><Container:Directory><rdf:Seq>' +
    '<rdf:li><Container:Item Item:Mime="image/jpeg" Item:Semantic="Primary" Item:Length="0"/></rdf:li>' +
    `<rdf:li><Container:Item Item:Mime="video/mp4" Item:Semantic="MotionPhoto" Item:Length="${mp4.length}"/></rdf:li>` +
    '</rdf:Seq></Container:Directory></x:xmpmeta>';
  fs.writeFileSync(file, Buffer.concat([jpg, Buffer.from(xmp), mp4]));
  return { jpg, mp4 };
}

describe('Bewegtfotos (Motion Photo)', () => {
  it('extractMotionVideo: findet das Video, sonst null (ohne ffmpeg prüfbar)', () => {
    const head = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from('ftypisom', 'latin1')]);
    const video = Buffer.concat([head, Buffer.alloc(40, 1)]);
    const xmp = (len: number) =>
      `<x:xmpmeta><Container:Item Item:Mime="video/mp4" Item:Semantic="MotionPhoto" Item:Length="${len}"/></x:xmpmeta>`;
    const photo = Buffer.concat([Buffer.alloc(100, 2), Buffer.from(xmp(video.length)), video]);
    expect(extractMotionVideo(photo)?.equals(video)).toBe(true);
    // Reihenfolge der Attribute ist egal; älteres Format (MicroVideoOffset)
    const legacy = Buffer.concat([
      Buffer.from(`<x:xmpmeta GCamera:MicroVideoOffset="${video.length}"/>`),
      Buffer.alloc(100, 2),
      video,
    ]);
    expect(extractMotionVideo(legacy)?.equals(video)).toBe(true);
    // normales Foto, falsche Länge, Länge zeigt nicht auf ein MP4
    expect(extractMotionVideo(Buffer.alloc(500, 3))).toBeNull();
    expect(extractMotionVideo(Buffer.concat([Buffer.from(xmp(999999)), video]))).toBeNull();
    expect(
      extractMotionVideo(Buffer.concat([Buffer.from(xmp(10)), Buffer.alloc(200, 4)])),
    ).toBeNull();
  });

  it.skipIf(!ffmpeg)(
    'Import legt Standbild und stumme Schleife nebeneinander ab, ohne GPS',
    async () => {
      const source = tmp('quelle-');
      const postDir = path.join(tmp('post-'), '2026-11-25-test');
      const { mp4 } = await motionPhoto(
        path.join(source, 'PXL_1.MP.jpg'),
        path.join(tmp('v-'), 'v.mp4'),
      );
      const r = await importMedia({ source, postDir, log: () => undefined });
      expect(r.photos[0]).toMatchObject({ file: '01.jpg', motion: '01.mp4' });
      const loop = path.join(postDir, 'photos', '01.mp4');
      expect(mp4Problems(fs.readFileSync(loop))).toEqual([]);
      const info = probeVideo(loop);
      expect(info.hasAudio).toBe(false);
      expect(info.duration).toBeGreaterThan(0.5);
      expect(fs.statSync(loop).size).toBeLessThan(mp4.length * 3);
      expect(await inspectImage(path.join(postDir, 'photos', '01.jpg'))).toEqual([]);
      expect(frontmatterSnippet(r)).toContain('motion: 01.mp4');
    },
  );

  it.skipIf(!ffmpeg)('ein normales Foto bekommt keine Schleife', async () => {
    const source = tmp('quelle-');
    const postDir = path.join(tmp('post-'), '2026-11-25-test');
    await sharp({ create: { width: 100, height: 100, channels: 3, background: '#fff' } })
      .jpeg()
      .toFile(path.join(source, 'normal.jpg'));
    const r = await importMedia({ source, postDir, log: () => undefined });
    expect(r.photos[0].motion).toBeUndefined();
    expect(fs.existsSync(path.join(postDir, 'photos', '01.mp4'))).toBe(false);
  });
});
