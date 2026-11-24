/**
 * Aufnahmezeit von Fotos und Videos (Zeitpunkt des Auslösens), damit der Import sie nach
 * Aufnahmezeit sortieren kann. Quellen in dieser Reihenfolge:
 *   Foto:  EXIF DateTimeOriginal (+ SubSecTimeOriginal), dann DateTimeDigitized, dann DateTime
 *   Video: Erstellungszeit im Container (ffprobe, `creation_time`)
 *   sonst: Zeitstempel im Dateinamen (z. B. PXL_20261124_153012345.jpg, IMG_20261124_153012.jpg)
 * Ohne Zeitangabe bleibt der Wert null; solche Dateien stehen am Ende, nach Dateiname.
 * Zeiten sind Millisekunden seit 1970. EXIF kennt meist keine Zeitzone: Foto-Zeiten sind
 * Ortszeit des Handys und werden nur untereinander verglichen (Fotos nie mit Videos).
 */

/** Liest die Aufnahmezeit aus einem EXIF-Block (Buffer, mit oder ohne „Exif\0\0“). */
export function exifCaptureTime(exif) {
  if (!exif || exif.length < 14) return null;
  const off = exif.subarray(0, 4).toString('latin1') === 'Exif' ? 6 : 0;
  const order = exif.subarray(off, off + 2).toString('latin1');
  const le = order === 'II';
  if (!le && order !== 'MM') return null;
  const u16 = (o) => (le ? exif.readUInt16LE(off + o) : exif.readUInt16BE(off + o));
  const u32 = (o) => (le ? exif.readUInt32LE(off + o) : exif.readUInt32BE(off + o));
  const inside = (o, n) => o >= 0 && off + o + n <= exif.length;

  /** Alle Einträge eines IFD als Map Tag → { type, count, valueOffset } */
  const entries = (ifd) => {
    const map = new Map();
    if (!inside(ifd, 2)) return map;
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12;
      if (!inside(e, 12)) break;
      map.set(u16(e), { type: u16(e + 2), count: u32(e + 4), at: e + 8 });
    }
    return map;
  };
  const ascii = (e) => {
    if (!e || e.type !== 2) return null;
    const start = e.count <= 4 ? e.at : u32(e.at);
    if (!inside(start, e.count)) return null;
    return exif.toString('latin1', off + start, off + start + e.count).replace(/\0.*$/s, '');
  };

  const ifd0 = entries(u32(4));
  const exifPtr = ifd0.get(0x8769);
  const sub = exifPtr && inside(u32(exifPtr.at), 2) ? entries(u32(exifPtr.at)) : new Map();
  const stamp = ascii(sub.get(0x9003)) ?? ascii(sub.get(0x9004)) ?? ascii(ifd0.get(0x0132));
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(stamp ?? '');
  if (!m) return null;
  const frac = (ascii(sub.get(0x9291)) ?? '').trim();
  const ms = /^\d+$/.test(frac) ? Number(frac.padEnd(3, '0').slice(0, 3)) : 0;
  return plausible(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms));
}

/** Zeitstempel im Dateinamen: …20261124_153012… oder …2026-11-24-15-30-12… (optional + Millisekunden). */
export function filenameCaptureTime(name) {
  const m =
    /(?<!\d)(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})[-_ .T]?(\d{2})[-_.]?(\d{2})[-_.]?(\d{2})(\d{0,3})(?!\d)/.exec(
      name,
    );
  if (!m) return null;
  const ms = m[7] ? Number(m[7].padEnd(3, '0')) : 0;
  return plausible(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms));
}

/** Zeit aus ffprobe-Tags (`creation_time`, ISO 8601); 1904/1970-Platzhalter zählen nicht. */
export function containerCaptureTime(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? plausible(t) : null;
}

/** Nur Zeiten nach 2000 und höchstens einen Tag in der Zukunft (sonst Platzhalter oder Unsinn). */
function plausible(t) {
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000) return null;
  if (t > Date.now() + 86_400_000) return null;
  return t;
}

const byName = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/**
 * Sortiert Einträge `{ name, time }` nach Aufnahmezeit (älteste zuerst); gleiche Zeit oder ohne
 * Zeit nach Dateiname; Einträge ohne Zeit stehen am Ende.
 */
export function sortByCapture(items) {
  return [...items].sort((a, b) => {
    if (a.time != null && b.time != null && a.time !== b.time) return a.time - b.time;
    if ((a.time == null) !== (b.time == null)) return a.time == null ? 1 : -1;
    return byName(a.name, b.name);
  });
}

/** Zeit als „2026-11-24 19:42:10“ für Ausgaben (UTC-Zahl, siehe Kopf). */
export function formatCaptureTime(t) {
  return t == null ? 'ohne Zeitangabe' : new Date(t).toISOString().slice(0, 19).replace('T', ' ');
}
