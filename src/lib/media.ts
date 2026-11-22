/** Zugriff auf die vom Bildskript erzeugten Bilder (.cache/media-manifest.json). */
import fs from 'node:fs';
import path from 'node:path';

export interface PhotoMedia {
  width: number;
  height: number;
  large: string;
  thumb400: string;
  thumb800: string;
  thumbWidth: number;
  thumbHeight: number;
  og?: string;
}

export interface MediaManifest {
  photos: Record<string, PhotoMedia>;
  profile: { 152: string; 88: string } | null;
}

let cache: MediaManifest | undefined;

export function loadManifest(file = path.resolve('.cache/media-manifest.json')): MediaManifest {
  if (!cache) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `${file} fehlt. Bitte zuerst das Bildskript ausführen: node scripts/images.mjs (oder npm run build / npm run dev).`,
      );
    }
    cache = JSON.parse(fs.readFileSync(file, 'utf8')) as MediaManifest;
  }
  return cache;
}

export function photoMedia(slug: string, file: string): PhotoMedia {
  const m = loadManifest().photos[`${slug}/${file}`];
  if (!m)
    throw new Error(`Bild ${slug}/${file} wurde nicht verarbeitet. Bildskript erneut ausführen.`);
  return m;
}
