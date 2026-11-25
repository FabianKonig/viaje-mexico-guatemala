/** Zugriff auf die vom Bildskript erzeugten Bilder (.cache/media-manifest.json). */
import fs from 'node:fs';
import path from 'node:path';
import type { Post } from './content';

export interface PhotoMedia {
  width: number;
  height: number;
  large: string;
  thumb400: string;
  thumb800: string;
  thumbWidth: number;
  thumbHeight: number;
  og?: string;
  /** Bewegtfoto: stummes Schleifenvideo (MP4). */
  motion?: string;
}

export interface ClipMedia {
  src: string;
  poster: string;
}

export interface MediaManifest {
  photos: Record<string, PhotoMedia>;
  clips: Record<string, ClipMedia>;
  /** Gezeichnete Titelbilder je Beitrag (Schlüssel: slug). */
  covers?: Record<string, PhotoMedia>;
  profile: { 240: string; 132: string } | null;
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

export function clipMedia(slug: string, file: string): ClipMedia {
  const m = loadManifest().clips?.[`${slug}/${file}`];
  if (!m)
    throw new Error(`Video ${slug}/${file} wurde nicht verarbeitet. Bildskript erneut ausführen.`);
  return m;
}

/** Titelbild eines Beitrags (Foto aus `cover`/erstes Foto oder gezeichnetes Titelbild). */
export function postCover(post: Post): { media: PhotoMedia; alt: string } | undefined {
  if (post.generatedCover) {
    const media = loadManifest().covers?.[post.slug];
    if (!media)
      throw new Error(
        `Titelbild ${post.slug}/${post.generatedCover.file} wurde nicht verarbeitet. Bildskript erneut ausführen.`,
      );
    return { media, alt: post.generatedCover.alt };
  }
  if (post.cover) return { media: photoMedia(post.slug, post.cover.file), alt: post.cover.alt };
  return undefined;
}
