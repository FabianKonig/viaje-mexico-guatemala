#!/usr/bin/env node
/**
 * Bildskript: verarbeitet die Fotos aller Beiträge und das Profilfoto.
 *  - entfernt ALLE Metadaten (EXIF/GPS, XMP, IPTC), dreht nach der EXIF-Ausrichtung
 *  - HEIC/HEIF → über heic-convert dekodiert
 *  - erzeugt 400 und 800 px breite Vorschaubilder, eine große Version (max. 1600 px lange Seite,
 *    WebP Qualität 80) und für das Titelbild jedes Beitrags (`cover`, sonst das erste Foto) ein Open-Graph-Bild (1200×630 JPEG)
 *  - verarbeitet nur Fotos, die im Frontmatter eines Beitrags stehen
 *  - prüft am Ende, dass keine Metadaten mehr enthalten sind; bricht sonst ab (Exit-Code 1)
 *  - kopiert die stumme Schleife eines Bewegtfotos (photos/NN.mp4, Feld `motion`) wie die Clips
 *  - kopiert die fertigen Videos (clips/*.mp4) mit Standbild nach public/media/ (kein Umwandeln, nur
 *    Prüfung auf Standort/Metadaten; umgewandelt wird beim Import, scripts/import-media.mjs)
 * Ausgabe: public/media/ (nicht eingecheckt) und .cache/media-manifest.json
 *
 * Aufruf: node scripts/images.mjs            (Inhaltsordner aus CONTENT_DIR, Standard: content)
 *         node scripts/images.mjs --verify <ordner>   (nur prüfen, z. B. dist)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import YAML from 'yaml';
import { exifHasGps, rawMetadataMarkers } from './lib/exif.mjs';
import { mp4Problems } from './lib/video.mjs';

export const PIPELINE_VERSION = 1;
export const LARGE = 1600;
export const THUMBS = [400, 800];
export const QUALITY = 80;
export const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i;
const PUBLISHED_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

sharp.cache(false);

/** Liest eine Bilddatei als Puffer, den sharp verarbeiten kann (HEIC wird umgewandelt). */
export async function decodeInput(file) {
  const buf = fs.readFileSync(file);
  if (/\.(heic|heif)$/i.test(file)) {
    const jpeg = await heicConvert({ buffer: buf, format: 'JPEG', quality: 0.95 });
    return Buffer.from(jpeg);
  }
  return buf;
}

/** Verarbeitet ein Foto in alle Größen. Liefert Puffer und Maße (ohne Metadaten). */
export async function renderPhoto(input, { og = false } = {}) {
  const base = () => sharp(input, { failOn: 'error' }).rotate();
  const large = await base()
    .resize({ width: LARGE, height: LARGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  const thumbs = {};
  for (const w of THUMBS) {
    thumbs[w] = await base()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });
  }
  const ogImg = og
    ? await base()
        .resize({ width: 1200, height: 630, fit: 'cover' })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer()
    : undefined;
  return { large, thumbs, og: ogImg };
}

/** Quadratisches Profilbild (3× für 76 px und 44 px, scharf auf Handys). */
export async function renderProfile(input) {
  const out = {};
  for (const size of [240, 132]) {
    out[size] = await sharp(input)
      .rotate()
      .resize({ width: size, height: size, fit: 'cover', position: 'attention' })
      .webp({ quality: 92 })
      .toBuffer();
  }
  return out;
}

/** Prüft eine einzelne Bilddatei auf Metadaten. Liefert Probleme (leer = sauber). */
export async function inspectImage(file) {
  const buf = fs.readFileSync(file);
  const problems = rawMetadataMarkers(buf);
  try {
    const m = await sharp(buf).metadata();
    if (m.exif) problems.push(exifHasGps(m.exif) ? 'EXIF mit GPS' : 'EXIF');
    if (m.xmp) problems.push('XMP');
    if (m.iptc) problems.push('IPTC');
  } catch (e) {
    problems.push(`nicht lesbar: ${e.message}`);
  }
  return [...new Set(problems)];
}

/** Prüft alle veröffentlichten Bilder in einem Ordner rekursiv. Wirft bei Metadaten-Resten. */
export async function verifyDir(dir) {
  const bad = [];
  let count = 0;
  const walk = async (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) await walk(p);
      else if (PUBLISHED_EXT.test(entry.name)) {
        count++;
        const problems = await inspectImage(p);
        if (problems.length) bad.push(`${p}: ${problems.join(', ')}`);
      } else if (/\.mp4$/i.test(entry.name)) {
        const problems = mp4Problems(fs.readFileSync(p));
        if (problems.length) bad.push(`${p}: ${problems.join(', ')}`);
      } else if (/\.(heic|heif|tiff?|dng|raw)$/i.test(entry.name)) {
        bad.push(`${p}: Originalformat darf nicht veröffentlicht werden`);
      }
    }
  };
  if (fs.existsSync(dir)) await walk(dir);
  if (bad.length) {
    throw new Error(
      'Metadaten (z. B. GPS) in veröffentlichten Bildern gefunden:\n  ' + bad.join('\n  '),
    );
  }
  return count;
}

function hash(buf) {
  return crypto
    .createHash('sha256')
    .update(buf)
    .update(`v${PIPELINE_VERSION}`)
    .digest('hex')
    .slice(0, 10);
}

function readFrontmatter(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  return m ? (YAML.parse(m[1]) ?? {}) : {};
}

function writeCached(cacheDir, name, producer) {
  const file = path.join(cacheDir, name);
  if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
  return producer().then((buf) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    return buf;
  });
}

/**
 * Verarbeitet alle Inhalte. Liefert das Manifest:
 * { photos: { "<slug>/<datei>": { width, height, thumb400, thumb800, large, og? } }, profile?: { 240, 132 } }
 * Pfade sind relativ zum Basispfad der Seite (z. B. "media/<slug>/01-ab12cd-400.webp").
 */
export async function processAll({
  contentDir = 'content',
  outDir = 'public/media',
  cacheDir = '.cache/media',
  manifestFile = '.cache/media-manifest.json',
  log = console.log,
} = {}) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = { photos: {}, clips: {}, profile: null };
  const postsDir = path.join(contentDir, 'posts');
  const emit = (rel, buf) => {
    const file = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    return 'media/' + rel.split(path.sep).join('/');
  };

  const slugs = fs.existsSync(postsDir)
    ? fs.readdirSync(postsDir).filter((s) => fs.existsSync(path.join(postsDir, s, 'index.md')))
    : [];
  let processed = 0;
  for (const slug of slugs) {
    const fm = readFrontmatter(path.join(postsDir, slug, 'index.md'));
    const photos = [...(Array.isArray(fm.photos) ? fm.photos : [])];
    // Titelbild: `cover` im Frontmatter, sonst das erste Foto (nur dafür entsteht das OG-Bild)
    const coverFile = typeof fm.cover === 'string' ? fm.cover : photos[0]?.file;
    // Nur-Titelbild: liegt in photos/, steht aber nicht in der Galerie
    if (coverFile && !photos.some((p) => p?.file === coverFile)) photos.push({ file: coverFile });
    for (const ph of photos) {
      if (!ph?.file || typeof ph.file !== 'string') continue;
      const src = path.join(postsDir, slug, 'photos', ph.file);
      if (!fs.existsSync(src)) continue; // meldet die Inhaltsprüfung beim Build
      const raw = fs.readFileSync(src);
      const h = hash(raw);
      const stem = path
        .basename(ph.file, path.extname(ph.file))
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-');
      const key = `${h}`;
      const metaFile = path.join(cacheDir, key, 'meta.json');
      let meta;
      if (
        fs.existsSync(metaFile) &&
        (ph.file !== coverFile || fs.existsSync(path.join(cacheDir, key, 'og.jpg')))
      ) {
        meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      } else {
        const input = await decodeInput(src);
        const r = await renderPhoto(input, { og: ph.file === coverFile });
        fs.mkdirSync(path.join(cacheDir, key), { recursive: true });
        fs.writeFileSync(path.join(cacheDir, key, 'large.webp'), r.large.data);
        for (const w of THUMBS)
          fs.writeFileSync(path.join(cacheDir, key, `${w}.webp`), r.thumbs[w].data);
        if (r.og) fs.writeFileSync(path.join(cacheDir, key, 'og.jpg'), r.og);
        meta = {
          width: r.large.info.width,
          height: r.large.info.height,
          thumbHeights: Object.fromEntries(THUMBS.map((w) => [w, r.thumbs[w].info.height])),
          thumbWidths: Object.fromEntries(THUMBS.map((w) => [w, r.thumbs[w].info.width])),
        };
        fs.writeFileSync(metaFile, JSON.stringify(meta));
        processed++;
      }
      const read = (n) => fs.readFileSync(path.join(cacheDir, key, n));
      const entry = {
        width: meta.width,
        height: meta.height,
        large: emit(path.join(slug, `${stem}-${h}-${LARGE}.webp`), read('large.webp')),
        thumb400: emit(path.join(slug, `${stem}-${h}-400.webp`), read('400.webp')),
        thumb800: emit(path.join(slug, `${stem}-${h}-800.webp`), read('800.webp')),
        thumbWidth: meta.thumbWidths[400],
        thumbHeight: meta.thumbHeights[400],
      };
      if (ph.file === coverFile)
        entry.og = emit(path.join(slug, `${stem}-${h}-og.jpg`), read('og.jpg'));
      if (typeof ph.motion === 'string') {
        const motionSrc = path.join(postsDir, slug, 'photos', ph.motion);
        if (fs.existsSync(motionSrc)) {
          const video = fs.readFileSync(motionSrc);
          const problems = mp4Problems(video);
          if (problems.length)
            throw new Error(`${slug}/photos/${ph.motion}: ${problems.join(', ')}`);
          entry.motion = emit(path.join(slug, `${stem}-${hash(video)}-motion.mp4`), video);
        }
      }
      manifest.photos[`${slug}/${ph.file}`] = entry;
    }

    const clips = Array.isArray(fm.clips) ? fm.clips : [];
    for (const c of clips) {
      if (!c?.file || typeof c.file !== 'string') continue;
      const src = path.join(postsDir, slug, 'clips', c.file);
      const posterSrc = src.replace(/\.mp4$/i, '.jpg');
      if (!fs.existsSync(src) || !fs.existsSync(posterSrc)) continue; // meldet die Inhaltsprüfung
      const video = fs.readFileSync(src);
      const problems = mp4Problems(video);
      if (problems.length) throw new Error(`${slug}/clips/${c.file}: ${problems.join(', ')}`);
      const h = hash(video);
      const stem = path
        .basename(c.file, path.extname(c.file))
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-');
      manifest.clips[`${slug}/${c.file}`] = {
        src: emit(path.join(slug, `${stem}-${h}.mp4`), video),
        poster: emit(path.join(slug, `${stem}-${h}-poster.jpg`), fs.readFileSync(posterSrc)),
      };
    }
  }

  const profileSrc = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).find((f) => /^profile\.(jpe?g|png|webp|heic|heif)$/i.test(f))
    : undefined;
  if (profileSrc) {
    const input = await decodeInput(path.join(contentDir, profileSrc));
    const r = await renderProfile(input);
    const h = hash(fs.readFileSync(path.join(contentDir, profileSrc)));
    manifest.profile = {
      240: emit(`profile-${h}-240.webp`, r[240]),
      132: emit(`profile-${h}-132.webp`, r[132]),
    };
  }

  const checked = await verifyDir(outDir);
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  log(
    `Bilder: ${Object.keys(manifest.photos).length} Fotos (${processed} neu verarbeitet), ${Object.keys(manifest.clips).length} Videos, ${checked} Dateien ohne Metadaten geprüft.`,
  );
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    if (process.argv[2] === '--verify') {
      const n = await verifyDir(process.argv[3] || 'dist');
      console.log(`Metadaten-Prüfung: ${n} Bilder ohne EXIF/GPS/XMP/IPTC.`);
    } else {
      await processAll({ contentDir: process.env.CONTENT_DIR || 'content' });
    }
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(1);
  }
}
