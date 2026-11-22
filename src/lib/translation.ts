/**
 * Zweisprachigkeit: Der Originaltext (original.md) bleibt byte-genau. Die Übersetzung besteht aus
 * Segmenten, die wörtliche Ausschnitte des Originals sind:
 *   lang "es": spanischer Ausschnitt + deutsche Übersetzung (de)
 *   lang "de": eigenes Deutsch des Autors, wird 1:1 übernommen
 * Die Segmente müssen das Original lückenlos und in Reihenfolge abdecken (dazwischen nur Leerraum).
 */
import crypto from 'node:crypto';

export type Lang = 'es' | 'de';

export interface Segment {
  lang: Lang;
  text: string;
  de?: string;
}

export interface TranslationData {
  source_sha256: string;
  segments: Segment[];
}

/** Ein Stück der Übersetzung. `sep` ist der Leerraum davor (aus dem Original, innerhalb eines Absatzes). */
export interface TranslationPiece {
  lang: Lang;
  /** Ausgabetext: bei "es" die Übersetzung, bei "de" der Originaltext unverändert. */
  text: string;
  /** Wörtlicher Ausschnitt aus dem Original. */
  source: string;
  sep: string;
}

export interface BuiltTranslation {
  /** Absätze der Übersetzungskachel in Reihenfolge des Originals. */
  paragraphs: TranslationPiece[][];
  /** true, wenn es spanische Passagen gibt (sonst entfällt die Übersetzungskachel). */
  hasSpanish: boolean;
  /** Sprachen in Reihenfolge des ersten Vorkommens, z. B. ["es", "de"]. */
  languages: Lang[];
}

export function sha256(data: string | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

const BLANK_LINE = /\n[ \t]*\r?\n/;

/** Prüft die Übersetzungsdaten gegen das Original. Liefert Fehlermeldungen (leer = gültig). */
export function validateTranslation(original: string, data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return ['translation fehlt'];
  const t = data as Partial<TranslationData>;
  if (typeof t.source_sha256 !== 'string') errors.push('translation.source_sha256 fehlt');
  else if (t.source_sha256 !== sha256(original))
    errors.push(
      `translation.source_sha256 passt nicht zu original.md (erwartet ${sha256(original)}). ` +
        'Wurde der Originaltext verändert oder die Übersetzung nicht aktualisiert?',
    );
  if (!Array.isArray(t.segments) || t.segments.length === 0) {
    errors.push('translation.segments fehlt oder ist leer');
    return errors;
  }
  let cursor = 0;
  t.segments.forEach((seg, i) => {
    const where = `translation.segments[${i}]`;
    if (!seg || typeof seg !== 'object') return errors.push(`${where}: kein Objekt`);
    if (seg.lang !== 'es' && seg.lang !== 'de')
      errors.push(`${where}.lang muss "es" oder "de" sein`);
    if (typeof seg.text !== 'string' || seg.text.trim() === '')
      return errors.push(`${where}.text fehlt`);
    if (seg.lang === 'es' && (typeof seg.de !== 'string' || seg.de.trim() === ''))
      errors.push(`${where}.de (Übersetzung) fehlt`);
    if (seg.lang === 'de' && seg.de !== undefined)
      errors.push(`${where}: deutsche Passagen haben keine Übersetzung (de entfernen)`);
    const idx = original.indexOf(seg.text, cursor);
    if (idx < 0) {
      errors.push(
        `${where}.text ist kein wörtlicher Ausschnitt aus original.md (ab Position ${cursor})`,
      );
      return;
    }
    const gap = original.slice(cursor, idx);
    if (gap.trim() !== '')
      errors.push(
        `${where}: Text vor diesem Segment fehlt in der Übersetzung: ${JSON.stringify(gap.trim().slice(0, 60))}`,
      );
    cursor = idx + seg.text.length;
  });
  const rest = original.slice(cursor);
  if (rest.trim() !== '')
    errors.push(
      `Text am Ende fehlt in der Übersetzung: ${JSON.stringify(rest.trim().slice(0, 60))}`,
    );
  return errors;
}

/** Baut die Übersetzungskachel. Setzt gültige Daten voraus (vorher validateTranslation). */
export function buildTranslation(original: string, data: TranslationData): BuiltTranslation {
  const paragraphs: TranslationPiece[][] = [];
  const languages: Lang[] = [];
  let cursor = 0;
  for (const seg of data.segments) {
    const idx = original.indexOf(seg.text, cursor);
    const gap = original.slice(cursor, idx);
    cursor = idx + seg.text.length;
    const piece: TranslationPiece = {
      lang: seg.lang,
      text: seg.lang === 'es' ? (seg.de as string) : seg.text,
      source: seg.text,
      sep: '',
    };
    if (!languages.includes(seg.lang)) languages.push(seg.lang);
    if (paragraphs.length === 0 || BLANK_LINE.test(gap)) {
      paragraphs.push([piece]);
    } else {
      piece.sep = gap === '' ? ' ' : gap;
      paragraphs[paragraphs.length - 1].push(piece);
    }
  }
  return { paragraphs, hasSpanish: languages.includes('es'), languages };
}

/** Kurzer Textanfang für Beitragskarten (Leerraum zusammengefasst, an Wortgrenze gekürzt). */
export function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.!?¡¿-]+$/, '') + ' …';
}
