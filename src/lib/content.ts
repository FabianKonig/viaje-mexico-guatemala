/**
 * Lädt und prüft die Inhalte (Ortsliste und Beiträge) aus dem Inhaltsordner.
 * Jeder Fehler bricht den Build mit einer verständlichen Meldung ab.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { isYmd } from './dates';
import {
  buildTranslation,
  validateTranslation,
  type BuiltTranslation,
  type TranslationData,
} from './translation';

export const MAX_PHOTOS = 30;
export const MAX_CLIPS = 10;
export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: 'MX' | 'GT';
  arrived: string;
  region?: string;
}

export interface PhotoRef {
  file: string;
  alt: string;
  caption?: string;
  /** Bewegtfoto: stumme Schleife (MP4 in photos/), liegt neben dem Standbild. */
  motion?: string;
}

/** Eigenes Video (liegt als MP4 in clips/, mit Standbild gleichen Namens als JPEG). */
export interface ClipRef {
  file: string;
  title: string;
  width: number;
  height: number;
  duration: number;
}

export interface Post {
  slug: string;
  dir: string;
  title: string;
  titleDe?: string;
  date: string;
  place?: Place;
  photos: PhotoRef[];
  /** Titelbild (Vorschau, WhatsApp): `cover` im Frontmatter (auch eine Datei in photos/, die nicht in der Galerie steht), sonst das erste Foto. */
  cover?: PhotoRef;
  clips: ClipRef[];
  /** Originaltext, byte-genau aus original.md. */
  original: string;
  translationData: TranslationData;
  translation: BuiltTranslation;
}

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super('Inhalte fehlerhaft:\n  - ' + problems.join('\n  - '));
    this.name = 'ContentError';
  }
}

export function contentDir(): string {
  return path.resolve(process.env.CONTENT_DIR || 'content');
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePlaces(
  raw: unknown,
  file = 'places.yaml',
): { places: Place[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(raw) || raw.length === 0)
    return { places: [], errors: [`${file}: Liste mit mindestens einem Ort erwartet`] };
  const ids = new Set<string>();
  let prevDate = '';
  const places = raw.map((p: Record<string, unknown>, i: number) => {
    const where = `${file}[${i}]`;
    if (typeof p?.id !== 'string' || !ID.test(p.id))
      errors.push(`${where}.id fehlt oder ist ungültig (klein, mit Bindestrichen)`);
    else if (ids.has(p.id)) errors.push(`${where}.id "${p.id}" kommt doppelt vor`);
    else ids.add(p.id);
    if (typeof p?.name !== 'string' || !p.name.trim()) errors.push(`${where}.name fehlt`);
    if (typeof p?.lat !== 'number' || p.lat < 10 || p.lat > 34)
      errors.push(`${where}.lat fehlt oder liegt nicht in México/Guatemala`);
    if (typeof p?.lon !== 'number' || p.lon < -119 || p.lon > -85)
      errors.push(`${where}.lon fehlt oder liegt nicht in México/Guatemala`);
    if (p?.country !== 'MX' && p?.country !== 'GT')
      errors.push(`${where}.country muss MX oder GT sein`);
    if (!isYmd(p?.arrived)) errors.push(`${where}.arrived muss ein Datum JJJJ-MM-TT sein`);
    else {
      if (prevDate && (p.arrived as string) < prevDate)
        errors.push(`${where}.arrived liegt vor dem vorherigen Ort (Reihenfolge = Reiseverlauf)`);
      prevDate = p.arrived as string;
    }
    if (p?.region !== undefined && (typeof p.region !== 'string' || !p.region.trim()))
      errors.push(`${where}.region muss Text sein`);
    return p as unknown as Place;
  });
  return { places, errors };
}

export function loadPlaces(dir = contentDir()): Place[] {
  const file = path.join(dir, 'places.yaml');
  if (!fs.existsSync(file)) throw new ContentError([`${file} fehlt`]);
  const { places, errors } = validatePlaces(YAML.parse(fs.readFileSync(file, 'utf8')), file);
  if (errors.length) throw new ContentError(errors);
  return places;
}

/** Trennt Frontmatter (YAML zwischen ---) vom Rest. */
export function parseFrontmatter(source: string): { data: unknown; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!m) throw new Error('Frontmatter (--- … ---) fehlt');
  return { data: YAML.parse(m[1]), body: m[2] };
}

export function validatePost(
  slug: string,
  dir: string,
  data: Record<string, unknown>,
  original: string | undefined,
  places: Place[],
): { post?: Post; errors: string[] } {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`${slug}: ${msg}`);
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    at('Ordnername muss JJJJ-MM-TT-slug sein (klein, Bindestriche)');
  if (typeof data.title !== 'string' || !data.title.trim()) at('title fehlt');
  if (data.titleDe !== undefined && (typeof data.titleDe !== 'string' || !data.titleDe.trim()))
    at('titleDe muss Text sein');
  if (!isYmd(data.date)) at('date muss ein Datum JJJJ-MM-TT sein');
  let place: Place | undefined;
  if (data.place !== undefined) {
    place = places.find((p) => p.id === data.place);
    if (!place) at(`place "${String(data.place)}" gibt es nicht in places.yaml`);
  }
  const photos: PhotoRef[] = [];
  if (data.photos !== undefined) {
    if (!Array.isArray(data.photos)) at('photos muss eine Liste sein');
    else {
      if (data.photos.length > MAX_PHOTOS)
        at(`höchstens ${MAX_PHOTOS} Fotos erlaubt (${data.photos.length})`);
      const seen = new Set<string>();
      data.photos.forEach((ph: Record<string, unknown>, i: number) => {
        const w = `photos[${i}]`;
        if (typeof ph?.file !== 'string' || !ph.file) return at(`${w}.file fehlt`);
        if (seen.has(ph.file)) at(`${w}.file "${ph.file}" doppelt`);
        seen.add(ph.file);
        if (!PHOTO_EXTENSIONS.includes(path.extname(ph.file).toLowerCase()))
          at(`${w}.file: Format nicht unterstützt (${PHOTO_EXTENSIONS.join(', ')})`);
        if (ph.file.includes('/') || ph.file.includes('\\'))
          at(`${w}.file: nur Dateiname, ohne Ordner`);
        else if (!fs.existsSync(path.join(dir, 'photos', ph.file)))
          at(`${w}.file: photos/${ph.file} existiert nicht`);
        if (typeof ph.alt !== 'string' || !ph.alt.trim()) at(`${w}.alt (Bildbeschreibung) fehlt`);
        if (ph.caption !== undefined && (typeof ph.caption !== 'string' || !ph.caption.trim()))
          at(`${w}.caption muss Text sein`);
        if (ph.motion !== undefined) {
          if (typeof ph.motion !== 'string' || !/^[^/\\]+\.mp4$/i.test(ph.motion))
            at(`${w}.motion muss ein Dateiname mit .mp4 sein (ohne Ordner)`);
          else if (!fs.existsSync(path.join(dir, 'photos', ph.motion)))
            at(`${w}.motion: photos/${ph.motion} existiert nicht`);
        }
        photos.push({
          file: ph.file,
          alt: String(ph.alt ?? ''),
          ...(ph.caption ? { caption: String(ph.caption) } : {}),
          ...(typeof ph.motion === 'string' ? { motion: ph.motion } : {}),
        });
      });
    }
  }
  let cover: PhotoRef | undefined = photos[0];
  if (data.cover !== undefined) {
    if (typeof data.cover !== 'string' || !data.cover)
      at('cover muss ein Dateiname aus photos sein');
    else {
      cover = photos.find((p) => p.file === data.cover);
      // Nur-Titelbild: Datei in photos/, die nicht in der Galerie (photos) steht
      if (
        !cover &&
        !data.cover.includes('/') &&
        !data.cover.includes('\\') &&
        PHOTO_EXTENSIONS.includes(path.extname(data.cover).toLowerCase()) &&
        fs.existsSync(path.join(dir, 'photos', data.cover))
      )
        cover = { file: data.cover, alt: 'Titelbild' };
      if (!cover) at(`cover "${data.cover}" ist kein Foto aus photos und liegt nicht in photos/`);
    }
  }
  if (data.videos !== undefined)
    at('videos (YouTube) gibt es nicht mehr: eigene Videos als clips eintragen (Import-Skript)');
  const clips: ClipRef[] = [];
  if (data.clips !== undefined) {
    if (!Array.isArray(data.clips)) at('clips muss eine Liste sein');
    else {
      if (data.clips.length > MAX_CLIPS)
        at(`höchstens ${MAX_CLIPS} Videos (clips) erlaubt (${data.clips.length})`);
      const seen = new Set<string>();
      data.clips.forEach((c: Record<string, unknown>, i: number) => {
        const w = `clips[${i}]`;
        if (typeof c?.file !== 'string' || !c.file) return at(`${w}.file fehlt`);
        if (seen.has(c.file)) at(`${w}.file "${c.file}" doppelt`);
        seen.add(c.file);
        if (path.extname(c.file).toLowerCase() !== '.mp4')
          at(`${w}.file muss eine .mp4-Datei sein`);
        if (c.file.includes('/') || c.file.includes('\\'))
          at(`${w}.file: nur Dateiname, ohne Ordner`);
        else {
          if (!fs.existsSync(path.join(dir, 'clips', c.file)))
            at(`${w}.file: clips/${c.file} existiert nicht`);
          const poster = c.file.replace(/\.mp4$/i, '.jpg');
          if (!fs.existsSync(path.join(dir, 'clips', poster)))
            at(`${w}: Standbild clips/${poster} fehlt (Import-Skript ausführen)`);
        }
        if (typeof c.title !== 'string' || !c.title.trim()) at(`${w}.title (Beschreibung) fehlt`);
        for (const k of ['width', 'height', 'duration'] as const)
          if (typeof c[k] !== 'number' || !(c[k] as number) || (c[k] as number) < 0)
            at(`${w}.${k} fehlt (Import-Skript trägt es ein)`);
        clips.push({
          file: c.file,
          title: String(c.title ?? ''),
          width: Number(c.width),
          height: Number(c.height),
          duration: Number(c.duration),
        });
      });
    }
  }
  if (original === undefined) at('original.md fehlt');
  else if (original.trim() === '') at('original.md ist leer');
  else for (const e of validateTranslation(original, data.translation)) at(e);

  if (errors.length) return { errors };
  const translationData = data.translation as TranslationData;
  return {
    errors,
    post: {
      slug,
      dir,
      title: data.title as string,
      ...(data.titleDe ? { titleDe: data.titleDe as string } : {}),
      date: data.date as string,
      ...(place ? { place } : {}),
      photos,
      ...(cover ? { cover } : {}),
      clips,
      original: original as string,
      translationData,
      translation: buildTranslation(original as string, translationData),
    },
  };
}

/** Alle Beiträge, neueste zuerst. */
export function loadPosts(dir = contentDir(), places = loadPlaces(dir)): Post[] {
  const postsDir = path.join(dir, 'posts');
  if (!fs.existsSync(postsDir)) return [];
  const errors: string[] = [];
  const posts: Post[] = [];
  for (const slug of fs.readdirSync(postsDir).sort()) {
    const postDir = path.join(postsDir, slug);
    if (!fs.statSync(postDir).isDirectory()) continue;
    const indexFile = path.join(postDir, 'index.md');
    if (!fs.existsSync(indexFile)) {
      errors.push(`${slug}: index.md fehlt`);
      continue;
    }
    let data: Record<string, unknown>;
    try {
      data = (parseFrontmatter(fs.readFileSync(indexFile, 'utf8')).data ?? {}) as Record<
        string,
        unknown
      >;
    } catch (e) {
      errors.push(`${slug}: index.md: ${(e as Error).message}`);
      continue;
    }
    const originalFile = path.join(postDir, 'original.md');
    const original = fs.existsSync(originalFile)
      ? fs.readFileSync(originalFile, 'utf8')
      : undefined;
    const r = validatePost(slug, postDir, data, original, places);
    errors.push(...r.errors);
    if (r.post) posts.push(r.post);
  }
  if (errors.length) throw new ContentError(errors);
  return posts.sort((a, b) =>
    a.date === b.date ? b.slug.localeCompare(a.slug) : b.date.localeCompare(a.date),
  );
}
