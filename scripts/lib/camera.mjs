/**
 * Kameraangaben (EXIF) ohne Abhängigkeiten.
 *
 * Importierte Fotos und das große veröffentlichte Bild behalten eine feste Liste von Kameraangaben
 * (siehe SPEC.md „Kameraangaben“). Alles andere bleibt entfernt: GPS, Seriennummern, Besitzer,
 * Hersteller-Notizen (MakerNote), Vorschaubild, XMP, IPTC. Die Liste ist eine Positivliste: Was
 * nicht darauf steht, wird nie geschrieben und bricht die Prüfung ab.
 *
 *   readCamera(exif)       → die erlaubten Angaben als schlichtes Objekt (oder null)
 *   cameraToSharpExif(c)   → Argument für sharp().withExif(…)
 *   cameraLine(c)          → Textzeile für die Großansicht: „Kamera · f/1,8 · 1/120 s · …“
 *                            (das Objektiv bleibt im EXIF, wird aber nie angezeigt)
 *   exifProblems(exif)     → Befunde, wenn der Block etwas außerhalb der Liste enthält
 */

/** Tag → Name, je Verzeichnis (IFD). */
const IFD0_TAGS = { 0x010f: 'Make', 0x0110: 'Model' };
const EXIF_TAGS = {
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8827: 'ISO',
  0x9003: 'DateTimeOriginal',
  0x9204: 'ExposureBias',
  0x9207: 'MeteringMode',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0xa403: 'WhiteBalance',
  0xa405: 'FocalLength35',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
};
/**
 * Verweis auf das Exif-Verzeichnis und rein technische Pflichtfelder, die libvips beim Schreiben
 * selbst ergänzt (Ausrichtung, Auflösung, Pixelmaße, Versionen, Farbraum). Sie enthalten nichts
 * Persönliches.
 */
const POINTER_EXIF = 0x8769;
const HARMLESS = new Set([
  POINTER_EXIF,
  0x0112, // Orientation
  0x011a, // XResolution
  0x011b, // YResolution
  0x0128, // ResolutionUnit
  0x0213, // YCbCrPositioning
  0x9000, // ExifVersion
  0x9101, // ComponentsConfiguration
  0xa000, // FlashpixVersion
  0xa001, // ColorSpace
  0xa002, // PixelXDimension
  0xa003, // PixelYDimension
]);

const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8 };

/** Liest die Verzeichnisse eines EXIF-Blocks. null, wenn der Block nicht lesbar ist. */
function walk(exif) {
  if (!exif || exif.length < 14) return null;
  const off = exif.subarray(0, 4).toString('latin1') === 'Exif' ? 6 : 0;
  const order = exif.subarray(off, off + 2).toString('latin1');
  const le = order === 'II';
  if (!le && order !== 'MM') return null;
  const u16 = (o) => (le ? exif.readUInt16LE(off + o) : exif.readUInt16BE(off + o));
  const u32 = (o) => (le ? exif.readUInt32LE(off + o) : exif.readUInt32BE(off + o));
  const s32 = (o) => (le ? exif.readInt32LE(off + o) : exif.readInt32BE(off + o));
  const inside = (o, n) => o >= 0 && off + o + n <= exif.length;

  const value = (type, count, at) => {
    const size = SIZE[type];
    if (!size || count > 4096) return undefined;
    const start = size * count <= 4 ? at : u32(at);
    if (!inside(start, size * count)) return undefined;
    if (type === 2)
      return exif
        .toString('latin1', off + start, off + start + count)
        .replace(/\0.*$/s, '')
        .trim();
    const list = [];
    for (let i = 0; i < count; i++) {
      const p = start + i * size;
      if (type === 3) list.push(u16(p));
      else if (type === 4) list.push(u32(p));
      else if (type === 5) list.push([u32(p), u32(p + 4)]);
      else if (type === 9) list.push(s32(p));
      else if (type === 10) list.push([s32(p), s32(p + 4)]);
      else list.push(exif[off + p]);
    }
    return list;
  };

  /** Alle Einträge eines Verzeichnisses als Map Tag → Wert. */
  const entries = (ifd) => {
    const map = new Map();
    if (!inside(ifd, 2)) return { map, next: 0 };
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (!inside(e, 12)) break;
      map.set(u16(e), { type: u16(e + 2), count: u32(e + 4), at: e + 8, value: undefined });
      map.get(u16(e)).value = value(u16(e + 2), u32(e + 4), e + 8);
    }
    const nextAt = ifd + 2 + n * 12;
    return { map, next: inside(nextAt, 4) ? u32(nextAt) : 0 };
  };

  const first = entries(u32(4));
  const ptr = first.map.get(POINTER_EXIF);
  const sub = ptr && ptr.value?.[0] ? entries(ptr.value[0]).map : new Map();
  return { ifd0: first.map, exif: sub, hasSecondIfd: first.next !== 0 };
}

const num = (r) => (Array.isArray(r) ? (r[1] ? r[0] / r[1] : NaN) : r);
const text = (v) =>
  typeof v === 'string'
    ? // eslint-disable-next-line no-control-regex
      v
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 120)
    : '';

/**
 * Die erlaubten Kameraangaben aus einem EXIF-Block. Felder, die fehlen oder unlesbar sind, fehlen
 * im Ergebnis. null, wenn gar nichts Erlaubtes darin steht.
 * Zahlen sind echte Zahlen (Sekunden, Blendenzahl, Millimeter), die Rohwerte stehen in `raw`
 * (Bruch für Belichtungszeit und Blende), damit sie unverändert zurückgeschrieben werden können.
 */
export function readCamera(exif) {
  const w = walk(exif);
  if (!w) return null;
  const pick = (map, tag) => map.get(tag)?.value;
  const c = {};
  const str = (key, map, tag) => {
    const t = text(pick(map, tag));
    if (t) c[key] = t;
  };
  const rational = (key, map, tag) => {
    const r = pick(map, tag)?.[0];
    const n = num(r);
    if (Array.isArray(r) && Number.isFinite(n) && n >= 0) c[key] = { n, r };
  };
  const int = (key, map, tag) => {
    const v = pick(map, tag)?.[0];
    if (Number.isInteger(v) && v >= 0) c[key] = v;
  };
  str('make', w.ifd0, 0x010f);
  str('model', w.ifd0, 0x0110);
  str('lensMake', w.exif, 0xa433);
  str('lensModel', w.exif, 0xa434);
  rational('exposureTime', w.exif, 0x829a);
  rational('fNumber', w.exif, 0x829d);
  rational('focalLength', w.exif, 0x920a);
  int('iso', w.exif, 0x8827);
  int('focalLength35', w.exif, 0xa405);
  int('exposureProgram', w.exif, 0x8822);
  int('meteringMode', w.exif, 0x9207);
  int('flash', w.exif, 0x9209);
  int('whiteBalance', w.exif, 0xa403);
  const bias = pick(w.exif, 0x9204)?.[0];
  if (Array.isArray(bias) && Number.isFinite(num(bias))) c.exposureBias = { n: num(bias), r: bias };
  const date = text(pick(w.exif, 0x9003));
  if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) c.dateTimeOriginal = date;
  if (c.iso === 0) delete c.iso;
  return Object.keys(c).length ? c : null;
}

const frac = (x) => `${x.r[0]}/${x.r[1]}`;

/** Argument für sharp().withExif(…): nur die erlaubten Angaben, sonst nichts. */
export function cameraToSharpExif(c) {
  if (!c) return {};
  const ifd0 = {};
  const ifd2 = {};
  if (c.make) ifd0.Make = c.make;
  if (c.model) ifd0.Model = c.model;
  if (c.lensMake) ifd2.LensMake = c.lensMake;
  if (c.lensModel) ifd2.LensModel = c.lensModel;
  if (c.exposureTime) ifd2.ExposureTime = frac(c.exposureTime);
  if (c.fNumber) ifd2.FNumber = frac(c.fNumber);
  if (c.focalLength) ifd2.FocalLength = frac(c.focalLength);
  if (c.exposureBias) ifd2.ExposureBiasValue = frac(c.exposureBias);
  if (c.iso) ifd2.ISOSpeedRatings = String(c.iso);
  if (c.focalLength35 != null) ifd2.FocalLengthIn35mmFilm = String(c.focalLength35);
  if (c.exposureProgram != null) ifd2.ExposureProgram = String(c.exposureProgram);
  if (c.meteringMode != null) ifd2.MeteringMode = String(c.meteringMode);
  if (c.flash != null) ifd2.Flash = String(c.flash);
  if (c.whiteBalance != null) ifd2.WhiteBalance = String(c.whiteBalance);
  if (c.dateTimeOriginal) ifd2.DateTimeOriginal = c.dateTimeOriginal;
  const out = {};
  if (Object.keys(ifd0).length) out.IFD0 = ifd0;
  if (Object.keys(ifd2).length) out.IFD2 = ifd2;
  return out;
}

/**
 * Prüft einen EXIF-Block gegen die Positivliste. Liefert Befunde (leer = erlaubt).
 * GPS, Vorschaubild (zweites Verzeichnis), MakerNote, Seriennummern, Besitzer usw. sind Befunde,
 * ebenso ein Block, den wir nicht lesen können.
 */
export function exifProblems(exif) {
  const w = walk(exif);
  if (!w) return ['EXIF nicht lesbar'];
  const problems = [];
  const hex = (t) => '0x' + t.toString(16).padStart(4, '0');
  for (const t of w.ifd0.keys()) {
    if (t === 0x8825) problems.push('EXIF mit GPS');
    else if (!(t in IFD0_TAGS) && !HARMLESS.has(t))
      problems.push(`EXIF-Tag ${hex(t)} (Hauptverzeichnis)`);
  }
  for (const t of w.exif.keys())
    if (!(t in EXIF_TAGS) && !HARMLESS.has(t)) problems.push(`EXIF-Tag ${hex(t)} (Exif)`);
  if (w.hasSecondIfd) problems.push('EXIF mit Vorschaubild');
  return problems;
}

// ---------- Anzeige ----------

/** Dezimalzahl auf Deutsch: höchstens `digits` Nachkommastellen, ohne überflüssige Nullen. */
function de(n, digits = 1) {
  return String(Number(n.toFixed(digits))).replace('.', ',');
}

const SUFFIXES = /\s+(corporation|corp\.?|inc\.?|co\.?,?\s*ltd\.?|ltd\.?|imaging|electronics)$/i;

/** Kameraname: Hersteller + Modell, ohne Doppelung („Canon“ + „Canon EOS R5“), ordentliche Schreibweise. */
export function cameraName(c) {
  const model = c.model ?? '';
  let make = (c.make ?? '').replace(SUFFIXES, '').replace(SUFFIXES, '');
  if (make && (make === make.toUpperCase() || make === make.toLowerCase()))
    make = make.replace(/\b([a-z])([a-z]*)/gi, (_, a, b) => a.toUpperCase() + b.toLowerCase());
  if (!model) return make;
  if (!make || model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return `${make} ${model}`;
}

export function formatAperture(f) {
  return `f/${de(f.n, 1)}`;
}

export function formatShutter(t) {
  if (t.n <= 0) return '';
  if (t.n >= 1) return `${de(t.n, 1)} s`;
  return `1/${Math.round(1 / t.n)} s`;
}

export function formatFocal(c) {
  const real = c.focalLength ? c.focalLength.n : null;
  const eq = c.focalLength35 || null;
  if (real == null && eq == null) return '';
  const realText = real != null ? `${de(real, 1)} mm` : '';
  if (real == null) return `${eq} mm KB`;
  if (eq == null || Math.round(real) === eq) return realText;
  return `${realText} (${eq} mm KB)`;
}

/**
 * Textzeile für die Großansicht in fester Reihenfolge: Kamera, Blende, Verschlusszeit, ISO,
 * Brennweite, getrennt durch einen Mittelpunkt. Fehlende Angaben entfallen, die Reihenfolge
 * bleibt. Leerer Text, wenn keine einzige Angabe vorhanden ist. Das Objektiv steht bewusst nicht
 * darin (Wunsch des Autors), bleibt aber in den EXIF-Daten der Datei.
 */
export function cameraLine(c) {
  if (!c) return '';
  const parts = [
    cameraName(c),
    c.fNumber && c.fNumber.n > 0 ? formatAperture(c.fNumber) : '',
    c.exposureTime ? formatShutter(c.exposureTime) : '',
    c.iso ? `ISO ${c.iso}` : '',
    formatFocal(c),
  ];
  return parts.filter(Boolean).join(' · ');
}
