import { describe, expect, it } from 'vitest';
import {
  buildTranslation,
  excerpt,
  sha256,
  validateTranslation,
  type Segment,
} from '../../src/lib/translation';

const data = (original: string, segments: Segment[]) => ({
  source_sha256: sha256(original),
  segments,
});

describe('Übersetzung: Beitrags-Parser', () => {
  it('gemischter Text: Spanisch übersetzt, Deutsch 1:1, Reihenfolge und Absätze wie im Original', () => {
    const original = 'Hoy llege a Mexico. Das ist toll!\n\nMañana voy al centro.\n';
    const segments: Segment[] = [
      { lang: 'es', text: 'Hoy llege a Mexico.', de: 'Heute bin ich in Mexiko angekommen.' },
      { lang: 'de', text: 'Das ist toll!' },
      { lang: 'es', text: 'Mañana voy al centro.', de: 'Morgen gehe ich ins Zentrum.' },
    ];
    expect(validateTranslation(original, data(original, segments))).toEqual([]);
    const t = buildTranslation(original, data(original, segments));
    expect(t.hasSpanish).toBe(true);
    expect(t.languages).toEqual(['es', 'de']);
    expect(t.paragraphs).toHaveLength(2);
    expect(t.paragraphs[0].map((p) => p.sep + p.text).join('')).toBe(
      'Heute bin ich in Mexiko angekommen. Das ist toll!',
    );
    expect(t.paragraphs[1][0].text).toBe('Morgen gehe ich ins Zentrum.');
    // deutsche Passage unverändert
    expect(t.paragraphs[0][1]).toMatchObject({
      lang: 'de',
      text: 'Das ist toll!',
      source: 'Das ist toll!',
    });
  });

  it('nur Spanisch', () => {
    const original = 'Uno.\n\nDos.';
    const t = buildTranslation(
      original,
      data(original, [
        { lang: 'es', text: 'Uno.', de: 'Eins.' },
        { lang: 'es', text: 'Dos.', de: 'Zwei.' },
      ]),
    );
    expect(t.hasSpanish).toBe(true);
    expect(t.languages).toEqual(['es']);
    expect(t.paragraphs.map((p) => p[0].text)).toEqual(['Eins.', 'Zwei.']);
  });

  it('nur Deutsch: keine spanischen Passagen (Übersetzungskachel entfällt)', () => {
    const original = 'Nur Deutsch hier.\nZweite Zeile.';
    const d = data(original, [{ lang: 'de', text: original }]);
    expect(validateTranslation(original, d)).toEqual([]);
    const t = buildTranslation(original, d);
    expect(t.hasSpanish).toBe(false);
    expect(t.paragraphs[0][0].text).toBe(original);
  });

  it('Zeilenumbruch innerhalb eines Absatzes bleibt erhalten', () => {
    const original = 'Hola.\nWie geht es?';
    const t = buildTranslation(
      original,
      data(original, [
        { lang: 'es', text: 'Hola.', de: 'Hallo.' },
        { lang: 'de', text: 'Wie geht es?' },
      ]),
    );
    expect(t.paragraphs).toHaveLength(1);
    expect(t.paragraphs[0][1].sep).toBe('\n');
  });

  it('erkennt veränderten Originaltext über den Hash', () => {
    const d = data('Hola.', [{ lang: 'es', text: 'Hola.', de: 'Hallo.' }]);
    expect(validateTranslation('Hola!', d).join()).toMatch(/source_sha256 passt nicht/);
  });

  it('erkennt fehlende, umgestellte und erfundene Passagen', () => {
    const original = 'Uno. Dos. Tres.';
    const h = sha256(original);
    expect(
      validateTranslation(original, {
        source_sha256: h,
        segments: [{ lang: 'es', text: 'Uno.', de: 'Eins.' }],
      }).join(),
    ).toMatch(/am Ende fehlt/);
    expect(
      validateTranslation(original, {
        source_sha256: h,
        segments: [
          { lang: 'es', text: 'Dos.', de: 'Zwei.' },
          { lang: 'es', text: 'Uno.', de: 'Eins.' },
        ],
      }).join(),
    ).toMatch(/vor diesem Segment fehlt|kein wörtlicher Ausschnitt/);
    expect(
      validateTranslation(original, {
        source_sha256: h,
        segments: [{ lang: 'es', text: 'Uno. Dos. Tres!', de: 'x' }],
      }).join(),
    ).toMatch(/kein wörtlicher Ausschnitt/);
  });

  it('verlangt Übersetzung bei Spanisch und keine bei Deutsch', () => {
    const o = 'Hola.';
    expect(validateTranslation(o, data(o, [{ lang: 'es', text: 'Hola.' }])).join()).toMatch(
      /de \(Übersetzung\) fehlt/,
    );
    expect(
      validateTranslation(o, data(o, [{ lang: 'de', text: 'Hola.', de: 'x' }])).join(),
    ).toMatch(/keine Übersetzung/);
    expect(validateTranslation(o, data(o, [])).join()).toMatch(/segments fehlt/);
    expect(validateTranslation(o, undefined)).toEqual(['translation fehlt']);
  });

  it('Textanfang für Karten', () => {
    expect(excerpt('Kurz.')).toBe('Kurz.');
    const long = 'palabra '.repeat(60);
    const e = excerpt(long, 50);
    expect(e.length).toBeLessThanOrEqual(52);
    expect(e.endsWith(' …')).toBe(true);
  });
});
