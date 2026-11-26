/**
 * Kameraangaben (EXIF) ohne Abhängigkeiten.
 *
 * Importierte Fotos und das große veröffentlichte Bild behalten eine feste Liste von Angaben
 * (siehe SPEC.md „Kameraangaben“): Kamera, Objektiv, Belichtung, Aufnahmezeit mit Zeitzone und
 * Sekundenbruchteilen und den Standort (GPS). Alles andere bleibt entfernt: Seriennummern, Besitzer,
 * Texte, Hersteller-Notizen (MakerNote), Vorschaubild, XMP, IPTC. Die Liste ist eine Positivliste: Was
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
  0x9011: 'OffsetTimeOriginal',
  0x9204: 'ExposureBias',
  0x9207: 'MeteringMode',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0x9291: 'SubSecTimeOriginal',
  0xa402: 'ExposureMode',
  0xa403: 'WhiteBalance',
  0xa404: 'DigitalZoomRatio',
  0xa405: 'FocalLength35',
  0xa406: 'SceneCaptureType',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
};
/**
 * Standort (GPS-Verzeichnis). Erlaubt sind Position, Höhe, Zeit, Blickrichtung, Geschwindigkeit
 * und Kartenbezug. Freie Texte (Berechnungsmethode, Ortsbeschreibung) und Zielangaben nicht.
 */
const GPS_TAGS = {
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x000c: 'GPSSpeedRef',
  0x000d: 'GPSSpeed',
  0x0010: 'GPSImgDirectionRef',
  0x0011: 'GPSImgDirection',
  0x0012: 'GPSMapDatum',
  0x001d: 'GPSDateStamp',
};
/**
 * Verweis auf das Exif-Verzeichnis und rein technische Pflichtfelder, die libvips beim Schreiben
 * selbst ergänzt (Ausrichtung, Auflösung, Pixelmaße, Versionen, Farbraum). Sie enthalten nichts
 * Persönliches.
 */
const POINTER_EXIF = 0x8769;
const POINTER_GPS = 0x8825;
const HARMLESS = new Set([
  POINTER_EXIF,
  POINTER_GPS,
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
  // Verweise müssen hinter den Kopf der Datei zeigen (kleinere Werte sind Müll)
  const sub = (tag) => {
    const at = first.map.get(tag)?.value?.[0];
    return Number.isInteger(at) && at >= 8 ? entries(at).map : new Map();
  };
  return {
    ifd0: first.map,
    exif: sub(POINTER_EXIF),
    gps: sub(POINTER_GPS),
    hasSecondIfd: first.next !== 0,
  };
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
  int('exposureMode', w.exif, 0xa402);
  int('sceneCaptureType', w.exif, 0xa406);
  rational('digitalZoomRatio', w.exif, 0xa404);
  const date = text(pick(w.exif, 0x9003));
  if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
    c.dateTimeOriginal = date;
    // Zeitzone und Sekundenbruchteile gehören zur Aufnahmezeit und gelten nur mit ihr
    const offset = text(pick(w.exif, 0x9011));
    if (/^[+-]\d{2}:\d{2}$/.test(offset)) c.offsetTimeOriginal = offset;
    const sub = text(pick(w.exif, 0x9291));
    if (/^\d{1,9}$/.test(sub)) c.subSecTimeOriginal = sub;
  }
  if (c.iso === 0) delete c.iso;
  const gps = readGps(w.gps);
  if (gps) c.gps = gps;
  return Object.keys(c).length ? c : null;
}

/** Liste aus genau `count` Brüchen [Zähler, Nenner] mit Nenner > 0, sonst null. */
function fractions(map, tag, count) {
  const v = map.get(tag)?.value;
  if (!Array.isArray(v) || v.length !== count) return null;
  const ok = v.every(
    (r) => Array.isArray(r) && r[1] > 0 && Number.isFinite(r[0] / r[1]) && r[0] >= 0,
  );
  return ok ? v : null;
}

/**
 * Standort aus dem GPS-Verzeichnis. Nur mit gültiger Position (Breite, Länge, Himmelsrichtung, im
 * Wertebereich); sonst null, dann bleibt auch alles andere aus dem GPS-Verzeichnis weg.
 */
function readGps(map) {
  if (!map?.size) return null;
  const ascii = (tag, re) => {
    const t = text(map.get(tag)?.value);
    return re.test(t) ? t : undefined;
  };
  const deg = (r) => r[0][0] / r[0][1] + r[1][0] / r[1][1] / 60 + r[2][0] / r[2][1] / 3600;
  const latRef = ascii(0x0001, /^[NS]$/);
  const lonRef = ascii(0x0003, /^[EW]$/);
  const lat = fractions(map, 0x0002, 3);
  const lon = fractions(map, 0x0004, 3);
  if (!latRef || !lonRef || !lat || !lon || deg(lat) > 90 || deg(lon) > 180) return null;
  const g = { latRef, lat, lonRef, lon };
  const altRef = map.get(0x0005)?.value?.[0];
  const alt = fractions(map, 0x0006, 1);
  if (alt && (altRef === 0 || altRef === 1)) Object.assign(g, { altRef, alt: alt[0] });
  const time = fractions(map, 0x0007, 3);
  const day = ascii(0x001d, /^\d{4}:\d{2}:\d{2}$/);
  if (time && day) Object.assign(g, { time, day });
  const dirRef = ascii(0x0010, /^[TM]$/);
  const dir = fractions(map, 0x0011, 1);
  if (dirRef && dir && dir[0][0] / dir[0][1] <= 360) Object.assign(g, { dirRef, dir: dir[0] });
  const speedRef = ascii(0x000c, /^[KMN]$/);
  const speed = fractions(map, 0x000d, 1);
  if (speedRef && speed) Object.assign(g, { speedRef, speed: speed[0] });
  const datum = ascii(0x0012, /^[A-Za-z0-9 -]{1,16}$/);
  if (datum) g.datum = datum;
  const version = map.get(0x0000)?.value;
  if (Array.isArray(version) && version.length === 4 && version.every((b) => b >= 0 && b <= 9))
    g.version = version;
  return g;
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
  if (c.exposureMode != null) ifd2.ExposureMode = String(c.exposureMode);
  if (c.sceneCaptureType != null) ifd2.SceneCaptureType = String(c.sceneCaptureType);
  if (c.digitalZoomRatio) ifd2.DigitalZoomRatio = frac(c.digitalZoomRatio);
  if (c.dateTimeOriginal) ifd2.DateTimeOriginal = c.dateTimeOriginal;
  if (c.offsetTimeOriginal) ifd2.OffsetTimeOriginal = c.offsetTimeOriginal;
  if (c.subSecTimeOriginal) ifd2.SubSecTimeOriginal = c.subSecTimeOriginal;
  const ifd3 = c.gps ? gpsToSharp(c.gps) : {};
  const out = {};
  if (Object.keys(ifd0).length) out.IFD0 = ifd0;
  if (Object.keys(ifd2).length) out.IFD2 = ifd2;
  if (Object.keys(ifd3).length) out.IFD3 = ifd3;
  return out;
}

const fracs = (list) => list.map((r) => `${r[0]}/${r[1]}`).join(' ');

/** GPS-Angaben als Zeichenketten für sharp (Verzeichnis IFD3). */
function gpsToSharp(g) {
  const out = {
    GPSLatitudeRef: g.latRef,
    GPSLatitude: fracs(g.lat),
    GPSLongitudeRef: g.lonRef,
    GPSLongitude: fracs(g.lon),
  };
  if (g.version) out.GPSVersionID = g.version.join(' ');
  if (g.alt) Object.assign(out, { GPSAltitudeRef: String(g.altRef), GPSAltitude: fracs([g.alt]) });
  if (g.time) Object.assign(out, { GPSTimeStamp: fracs(g.time), GPSDateStamp: g.day });
  if (g.dir) Object.assign(out, { GPSImgDirectionRef: g.dirRef, GPSImgDirection: fracs([g.dir]) });
  if (g.speed) Object.assign(out, { GPSSpeedRef: g.speedRef, GPSSpeed: fracs([g.speed]) });
  if (g.datum) out.GPSMapDatum = g.datum;
  return out;
}

/**
 * Prüft einen EXIF-Block gegen die Positivliste. Liefert Befunde (leer = erlaubt).
 * Vorschaubild (zweites Verzeichnis), MakerNote, Seriennummern, Besitzer, Freitexte, GPS-Tags
 * außerhalb der Liste usw. sind Befunde, ebenso ein Block, den wir nicht lesen können.
 */
export function exifProblems(exif) {
  const w = walk(exif);
  if (!w) return ['EXIF nicht lesbar'];
  const problems = [];
  const hex = (t) => '0x' + t.toString(16).padStart(4, '0');
  for (const t of w.ifd0.keys())
    if (!(t in IFD0_TAGS) && !HARMLESS.has(t))
      problems.push(`EXIF-Tag ${hex(t)} (Hauptverzeichnis)`);
  for (const t of w.exif.keys())
    if (!(t in EXIF_TAGS) && !HARMLESS.has(t)) problems.push(`EXIF-Tag ${hex(t)} (Exif)`);
  for (const t of w.gps.keys()) if (!(t in GPS_TAGS)) problems.push(`EXIF-Tag ${hex(t)} (GPS)`);
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
