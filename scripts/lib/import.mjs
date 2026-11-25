/**
 * Import: nimmt einen Ordner mit Handy-Originalen (Fotos, Videos) und legt verkleinerte, von
 * Metadaten (GPS usw.) befreite Dateien im Beitragsordner ab; nur die erlaubten Kameraangaben bleiben. Die Originale werden nur gelesen,
 * nie kopiert. Erst danach darf committet werden.
 *
 *   Fotos  → content/posts/<slug>/photos/NN.jpg  (lange Seite höchstens 1600 px, JPEG)
 *   Bewegtfotos (Android) → zusätzlich photos/NN.mp4 (stumme Schleife, 720p)
 *   Videos → content/posts/<slug>/clips/NN.mp4   (kürzere Seite höchstens 720 px, H.264/AAC, mit Ton)
 *            content/posts/<slug>/clips/NN.jpg   (Standbild)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { decodeInput, inspectImage, IMAGE_EXT, LARGE } from '../images.mjs';
import { cameraToSharpExif, readCamera } from './camera.mjs';
import {
  containerCaptureTime,
  exifCaptureTime,
  filenameCaptureTime,
  formatCaptureTime,
  sortByCapture,
} from './captured.mjs';
import {
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  VIDEO_EXT,
  extractMotionVideo,
  mp4Problems,
  posterFrom,
  probeVideo,
  transcodeVideo,
} from './video.mjs';

export const PHOTO_JPEG_QUALITY = 85;

/** Fotos im Beitrag: Dateien, die schon als NN.jpg usw. vorliegen, zählen für die Nummerierung. */
export function nextNumber(dir) {
  if (!fs.existsSync(dir)) return 1;
  const nums = fs
    .readdirSync(dir)
    .map((f) => /^(\d+)\./.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

const pad = (n) => String(n).padStart(2, '0');

/** Aufnahmezeit einer Datei (Foto: EXIF, Video: Container, sonst Dateiname) oder null. */
export async function captureTimeOf(file) {
  const name = path.basename(file);
  let time = null;
  if (IMAGE_EXT.test(name)) {
    for (const input of [file, null]) {
      try {
        const meta = await sharp(input ?? (await decodeInput(file)), { failOn: 'none' }).metadata();
        time = exifCaptureTime(meta.exif);
      } catch {
        time = null;
      }
      if (time != null) break;
    }
  } else if (VIDEO_EXT.test(name)) {
    try {
      time = containerCaptureTime(probeVideo(file).created);
    } catch {
      time = null;
    }
  }
  return time ?? filenameCaptureTime(name);
}

/**
 * Medien einer Quelle nach Aufnahmezeit: erst alle Fotos, dann alle Videos, je Gruppe älteste zuerst.
 * Liefert [{ name, time, kind }] mit kind 'photo' | 'video' | 'other'.
 */
export async function listByCaptureTime(source) {
  const entries = fs
    .readdirSync(source, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name);
  const kindOf = (n) => (IMAGE_EXT.test(n) ? 'photo' : VIDEO_EXT.test(n) ? 'video' : 'other');
  const items = [];
  for (const name of entries) {
    const kind = kindOf(name);
    const time = kind === 'other' ? null : await captureTimeOf(path.join(source, name));
    items.push({ name, time, kind });
  }
  return ['photo', 'video', 'other'].flatMap((k) =>
    sortByCapture(items.filter((i) => i.kind === k)),
  );
}

/**
 * Verkleinertes Foto (JPEG, lange Seite höchstens 1600 px) ohne Metadaten bis auf die erlaubten
 * Kameraangaben (scripts/lib/camera.mjs). GPS, Seriennummer usw. werden nie übernommen.
 */
export async function shrinkPhoto(input) {
  const camera = readCamera((await sharp(input, { failOn: 'none' }).metadata()).exif);
  const exif = cameraToSharpExif(camera);
  let pipeline = sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: LARGE, height: LARGE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: PHOTO_JPEG_QUALITY, mozjpeg: true });
  if (Object.keys(exif).length) pipeline = pipeline.withExif(exif);
  return pipeline.toBuffer({ resolveWithObject: true });
}

/**
 * Importiert alle Fotos und Videos aus `source` in den Beitrag `postDir`.
 * Liefert { photos, clips, skipped } mit den neuen Dateien (für den Frontmatter-Vorschlag).
 */
export async function importMedia({ source, postDir, log = console.log }) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory())
    throw new Error(`Quellordner nicht gefunden: ${source}`);
  // Fotos und Videos je nach Aufnahmezeit (Auslöser), die Nummern NN folgen dieser Reihenfolge.
  const sorted = await listByCaptureTime(source);
  const files = sorted.map((i) => i.name);
  const times = new Map(sorted.map((i) => [i.name, i.time]));
  const photosDir = path.join(postDir, 'photos');
  const clipsDir = path.join(postDir, 'clips');
  const result = { photos: [], clips: [], skipped: [] };
  let photoNo = nextNumber(photosDir);
  let clipNo = nextNumber(clipsDir);

  for (const name of files) {
    const src = path.join(source, name);
    if (IMAGE_EXT.test(name)) {
      const out = await shrinkPhoto(await decodeInput(src));
      const file = `${pad(photoNo++)}.jpg`;
      fs.mkdirSync(photosDir, { recursive: true });
      const dest = path.join(photosDir, file);
      fs.writeFileSync(dest, out.data);
      const problems = await inspectImage(dest, { camera: true });
      if (problems.length) {
        fs.rmSync(dest);
        throw new Error(`${name}: Metadaten im Ergebnis (${problems.join(', ')})`);
      }
      const photo = {
        source: name,
        taken: times.get(name),
        file,
        width: out.info.width,
        height: out.info.height,
        bytes: out.data.length,
      };
      // Android-Bewegtfoto: das eingebettete Video wird (stumm, klein) als Schleife daneben gelegt.
      const motion = /\.jpe?g$/i.test(name) ? extractMotionVideo(fs.readFileSync(src)) : null;
      if (motion) Object.assign(photo, importMotion(motion, photosDir, file));
      result.photos.push(photo);
      log(
        `Foto   ${name} [${formatCaptureTime(times.get(name))}] → photos/${file} (${Math.round(out.data.length / 1024)} KB)` +
          (photo.motion
            ? ` + Bewegung ${photo.motion} (${Math.round(photo.motionBytes / 1024)} KB)`
            : ''),
      );
    } else if (VIDEO_EXT.test(name)) {
      const info = probeVideo(src);
      if (info.duration > MAX_CLIP_SECONDS) {
        result.skipped.push({ source: name, why: `länger als ${MAX_CLIP_SECONDS} s` });
        log(`Übersprungen: ${name} (länger als ${MAX_CLIP_SECONDS} Sekunden)`);
        continue;
      }
      const stem = pad(clipNo++);
      fs.mkdirSync(clipsDir, { recursive: true });
      const dest = path.join(clipsDir, `${stem}.mp4`);
      transcodeVideo(src, dest, info);
      const buf = fs.readFileSync(dest);
      const problems = mp4Problems(buf);
      if (buf.length > MAX_CLIP_BYTES) problems.push(`größer als ${MAX_CLIP_BYTES / 1048576} MiB`);
      if (problems.length) {
        fs.rmSync(dest);
        throw new Error(`${name}: ${problems.join(', ')}`);
      }
      const out = probeVideo(dest);
      fs.writeFileSync(path.join(clipsDir, `${stem}.jpg`), await posterFrom(dest, out.duration));
      result.clips.push({
        source: name,
        taken: times.get(name),
        file: `${stem}.mp4`,
        width: out.width,
        height: out.height,
        duration: Math.round(out.duration * 10) / 10,
        bytes: buf.length,
        hasAudio: out.hasAudio,
      });
      log(
        `Video  ${name} [${formatCaptureTime(times.get(name))}] → clips/${stem}.mp4 (${(buf.length / 1048576).toFixed(1)} MB, ${Math.round(out.duration)} s${out.hasAudio ? ', mit Ton' : ', ohne Ton'})`,
      );
    } else {
      result.skipped.push({ source: name, why: 'unbekanntes Format' });
      log(`Übersprungen: ${name} (unbekanntes Format)`);
    }
  }
  return result;
}

/** Wandelt das Video eines Bewegtfotos um (stumm, 720p) und legt es als photos/NN.mp4 ab. */
function importMotion(video, photosDir, photoFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-'));
  try {
    const raw = path.join(dir, 'motion.mp4');
    fs.writeFileSync(raw, video);
    const info = { ...probeVideo(raw), hasAudio: false };
    const file = photoFile.replace(/\.jpg$/i, '.mp4');
    const dest = path.join(photosDir, file);
    transcodeVideo(raw, dest, info);
    const buf = fs.readFileSync(dest);
    const problems = mp4Problems(buf);
    if (problems.length) {
      fs.rmSync(dest);
      throw new Error(`Bewegtfoto ${photoFile}: ${problems.join(', ')}`);
    }
    return { motion: file, motionBytes: buf.length };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Frontmatter-Vorschlag für die neuen Dateien. Die Texte sind bewusst neutral („Foto 1 von 3“,
 * „Video 1“): Der Bildinhalt wird nicht ausgewertet oder beschrieben (Wunsch des Autors).
 */
export function frontmatterSnippet(result) {
  const lines = [];
  if (result.photos.length) {
    lines.push('photos:');
    for (const [i, p] of result.photos.entries()) {
      lines.push(`  - file: ${p.file}`, `    alt: 'Foto ${i + 1} von ${result.photos.length}'`);
      if (p.motion) lines.push(`    motion: ${p.motion}`);
    }
  }
  if (result.clips.length) {
    lines.push('clips:');
    for (const [i, c] of result.clips.entries()) {
      lines.push(
        `  - file: ${c.file}`,
        `    title: 'Video ${i + 1}'`,
        `    width: ${c.width}`,
        `    height: ${c.height}`,
        `    duration: ${c.duration}`,
      );
    }
  }
  return lines.join('\n');
}
