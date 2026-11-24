/**
 * Import: nimmt einen Ordner mit Handy-Originalen (Fotos, Videos) und legt verkleinerte, von
 * Metadaten (GPS, EXIF) befreite Dateien im Beitragsordner ab. Die Originale werden nur gelesen,
 * nie kopiert. Erst danach darf committet werden.
 *
 *   Fotos  → content/posts/<slug>/photos/NN.jpg  (lange Seite höchstens 1600 px, JPEG)
 *   Videos → content/posts/<slug>/clips/NN.mp4   (kürzere Seite höchstens 720 px, H.264/AAC, mit Ton)
 *            content/posts/<slug>/clips/NN.jpg   (Standbild)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { decodeInput, inspectImage, IMAGE_EXT, LARGE } from '../images.mjs';
import {
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  VIDEO_EXT,
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

const byName = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/** Verkleinertes Foto ohne Metadaten (JPEG, lange Seite höchstens 1600 px). */
export async function shrinkPhoto(input) {
  return sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: LARGE, height: LARGE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: PHOTO_JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
}

/**
 * Importiert alle Fotos und Videos aus `source` in den Beitrag `postDir`.
 * Liefert { photos, clips, skipped } mit den neuen Dateien (für den Frontmatter-Vorschlag).
 */
export async function importMedia({ source, postDir, log = console.log }) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory())
    throw new Error(`Quellordner nicht gefunden: ${source}`);
  const files = fs
    .readdirSync(source, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort(byName);
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
      const problems = await inspectImage(dest);
      if (problems.length) {
        fs.rmSync(dest);
        throw new Error(`${name}: Metadaten im Ergebnis (${problems.join(', ')})`);
      }
      result.photos.push({
        source: name,
        file,
        width: out.info.width,
        height: out.info.height,
        bytes: out.data.length,
      });
      log(`Foto   ${name} → photos/${file} (${Math.round(out.data.length / 1024)} KB)`);
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
        file: `${stem}.mp4`,
        width: out.width,
        height: out.height,
        duration: Math.round(out.duration * 10) / 10,
        bytes: buf.length,
        hasAudio: out.hasAudio,
      });
      log(
        `Video  ${name} → clips/${stem}.mp4 (${(buf.length / 1048576).toFixed(1)} MB, ${Math.round(out.duration)} s${out.hasAudio ? ', mit Ton' : ', ohne Ton'})`,
      );
    } else {
      result.skipped.push({ source: name, why: 'unbekanntes Format' });
      log(`Übersprungen: ${name} (unbekanntes Format)`);
    }
  }
  return result;
}

/** Frontmatter-Vorschlag für die neuen Dateien (alt und title muss der Agent ergänzen). */
export function frontmatterSnippet(result) {
  const lines = [];
  if (result.photos.length) {
    lines.push('photos:');
    for (const p of result.photos) {
      lines.push(`  - file: ${p.file}`, `    alt: 'TODO deutsche Bildbeschreibung (${p.source})'`);
    }
  }
  if (result.clips.length) {
    lines.push('clips:');
    for (const c of result.clips) {
      lines.push(
        `  - file: ${c.file}`,
        `    title: 'TODO kurzer Titel (${c.source})'`,
        `    width: ${c.width}`,
        `    height: ${c.height}`,
        `    duration: ${c.duration}`,
      );
    }
  }
  return lines.join('\n');
}
