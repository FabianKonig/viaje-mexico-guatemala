import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ContentError,
  loadPlaces,
  loadPosts,
  validatePlaces,
  validatePost,
  type Place,
} from '../../src/lib/content';
import { sha256 } from '../../src/lib/translation';
import { formatDateDe, isYmd, todayInTimeZone } from '../../src/lib/dates';

const places: Place[] = [
  {
    id: 'ciudad-de-mexico',
    name: 'Ciudad de México',
    lat: 19.43,
    lon: -99.13,
    country: 'MX',
    arrived: '2026-11-23',
  },
];

function tmpPost(photos: string[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'post-'));
  fs.mkdirSync(path.join(dir, 'photos'));
  for (const p of photos) fs.writeFileSync(path.join(dir, 'photos', p), 'x');
  return dir;
}
const original = 'Hola.';
const base = () => ({
  title: 'Hola',
  date: '2026-11-24',
  place: 'ciudad-de-mexico',
  translation: {
    source_sha256: sha256(original),
    segments: [{ lang: 'es', text: 'Hola.', de: 'Hallo.' }],
  },
});

describe('Inhalte: echte Inhalte', () => {
  it('Ortsliste und Beiträge im Ordner content/ sind gültig', () => {
    const p = loadPlaces('content');
    expect(p[0]).toMatchObject({ id: 'ciudad-de-mexico', name: 'Ciudad de México' });
    const posts = loadPosts('content', p);
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.original).toBe(fs.readFileSync(path.join(post.dir, 'original.md'), 'utf8'));
    }
  });

  it('Testinhalte (Grenzfälle) sind gültig, neueste zuerst', () => {
    const posts = loadPosts('tests/fixtures/content');
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(posts.find((p) => p.slug.endsWith('sin-lugar'))?.place).toBeUndefined();
    expect(posts.find((p) => p.slug.endsWith('solo-aleman'))?.translation.hasSpanish).toBe(false);
  });
});

describe('Inhalte: Frontmatter-Prüfung', () => {
  it('gültiger Beitrag', () => {
    const r = validatePost('2026-11-24-hola', tmpPost(), base(), original, places);
    expect(r.errors).toEqual([]);
    expect(r.post?.place?.name).toBe('Ciudad de México');
  });

  it('Pflichtfelder', () => {
    const r = validatePost(
      '2026-11-24-hola',
      tmpPost(),
      { translation: base().translation },
      original,
      places,
    );
    expect(r.errors.join('\n')).toMatch(/title fehlt/);
    expect(r.errors.join('\n')).toMatch(/date muss/);
  });

  it('Beitrag ohne Ort ist erlaubt, unbekannter Ort nicht', () => {
    const { place: _p, ...noPlace } = base();
    expect(validatePost('2026-11-24-hola', tmpPost(), noPlace, original, places).errors).toEqual(
      [],
    );
    expect(
      validatePost(
        '2026-11-24-hola',
        tmpPost(),
        { ...base(), place: 'tikal' },
        original,
        places,
      ).errors.join(),
    ).toMatch(/place "tikal" gibt es nicht/);
  });

  it('Fotos müssen existieren, Alt-Text haben, höchstens 20', () => {
    const dir = tmpPost(['01.jpg']);
    expect(
      validatePost(
        '2026-11-24-hola',
        dir,
        { ...base(), photos: [{ file: '01.jpg', alt: 'Ein Foto' }] },
        original,
        places,
      ).errors,
    ).toEqual([]);
    const missing = validatePost(
      '2026-11-24-hola',
      dir,
      { ...base(), photos: [{ file: '02.jpg', alt: 'x' }] },
      original,
      places,
    );
    expect(missing.errors.join()).toMatch(/existiert nicht/);
    const noAlt = validatePost(
      '2026-11-24-hola',
      dir,
      { ...base(), photos: [{ file: '01.jpg' }] },
      original,
      places,
    );
    expect(noAlt.errors.join()).toMatch(/alt/);
    const many = Array.from({ length: 21 }, (_, i) => `${String(i).padStart(2, '0')}.jpg`);
    const dir21 = tmpPost(many);
    const tooMany = validatePost(
      '2026-11-24-hola',
      dir21,
      { ...base(), photos: many.map((file) => ({ file, alt: 'x' })) },
      original,
      places,
    );
    expect(tooMany.errors.join()).toMatch(/höchstens 20/);
    const twenty = many.slice(0, 20).map((file) => ({ file, alt: 'x' }));
    expect(
      validatePost('2026-11-24-hola', dir21, { ...base(), photos: twenty }, original, places)
        .errors,
    ).toEqual([]);
  });

  it('fehlendes oder leeres Original', () => {
    expect(
      validatePost('2026-11-24-hola', tmpPost(), base(), undefined, places).errors.join(),
    ).toMatch(/original.md fehlt/);
    expect(validatePost('2026-11-24-hola', tmpPost(), base(), '  ', places).errors.join()).toMatch(
      /leer/,
    );
  });

  it('Videos brauchen eine gültige YouTube-ID und einen Titel', () => {
    const ok = validatePost(
      '2026-11-24-hola',
      tmpPost(),
      { ...base(), videos: [{ youtube: 'abcdefghijk', title: 'Video' }] },
      original,
      places,
    );
    expect(ok.errors).toEqual([]);
    const bad = validatePost(
      '2026-11-24-hola',
      tmpPost(),
      { ...base(), videos: [{ youtube: 'https://youtu.be/x' }] },
      original,
      places,
    );
    expect(bad.errors.length).toBe(2);
  });

  it('Ordnername', () => {
    expect(validatePost('Hola Mexico', tmpPost(), base(), original, places).errors.join()).toMatch(
      /Ordnername/,
    );
  });

  it('loadPosts meldet alle Fehler gesammelt', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
    fs.writeFileSync(
      path.join(dir, 'places.yaml'),
      '- {id: a, name: A, lat: 19, lon: -99, country: MX, arrived: 2026-11-23}\n',
    );
    fs.mkdirSync(path.join(dir, 'posts', '2026-11-24-a'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'posts', '2026-11-24-a', 'index.md'), '---\ntitle: A\n---\n');
    expect(() => loadPosts(dir)).toThrow(ContentError);
  });
});

describe('Inhalte: Ortsliste', () => {
  it('prüft Felder, doppelte IDs und Reihenfolge der Daten', () => {
    const ok = validatePlaces(places);
    expect(ok.errors).toEqual([]);
    const bad = validatePlaces([
      { ...places[0] },
      { ...places[0], arrived: '2026-11-20', lat: 50, country: 'US' },
    ]);
    const msg = bad.errors.join('\n');
    expect(msg).toMatch(/doppelt/);
    expect(msg).toMatch(/lat/);
    expect(msg).toMatch(/country/);
    expect(msg).toMatch(/vor dem vorherigen Ort/);
    expect(validatePlaces([]).errors.length).toBe(1);
  });
});

describe('Datumshilfen', () => {
  it('prüft und formatiert Datumswerte', () => {
    expect(isYmd('2026-11-23')).toBe(true);
    expect(isYmd('2026-02-30')).toBe(false);
    expect(isYmd('23.11.2026')).toBe(false);
    expect(formatDateDe('2026-11-23')).toBe('23. November 2026');
    expect(todayInTimeZone(new Date('2026-11-24T05:59:00Z'), 'America/Mexico_City')).toBe(
      '2026-11-23',
    );
  });
});
