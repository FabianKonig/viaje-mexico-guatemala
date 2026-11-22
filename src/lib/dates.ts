/**
 * Datumswerte ohne Uhrzeit ("JJJJ-MM-TT"). Gerechnet wird in UTC, damit Sommer-/Winterzeit
 * keine Rolle spielt.
 */
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isYmd(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = YMD.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Tage seit 1970-01-01 für ein Datum "JJJJ-MM-TT". */
export function ymdToDayIndex(ymd: string): number {
  if (!isYmd(ymd)) throw new Error(`Ungültiges Datum: ${ymd}`);
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Differenz in Kalendertagen (b − a). */
export function daysBetween(a: string, b: string): number {
  return ymdToDayIndex(b) - ymdToDayIndex(a);
}

/** "2026-11-23" → "23. November 2026" */
export function formatDateDe(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Heutiges Datum "JJJJ-MM-TT" in einer Zeitzone (z. B. America/Mexico_City). */
export function todayInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
