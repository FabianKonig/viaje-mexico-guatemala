/**
 * Reisetag-Berechnung mit Datumswerten ohne Uhrzeit (Sommer-/Winterzeit spielt keine Rolle).
 * Der 23. November 2026 ist Tag 1, der 2. Februar 2027 Tag 72, ab dem 3. Februar 2027 ist die Reise beendet.
 * Das „heutige“ Datum gilt in der Zeitzone America/Mexico_City, damit alle Besucher denselben Tag sehen.
 */
import { SITE } from '../config';
import { daysBetween, formatDateDe, isYmd, todayInTimeZone } from './dates';

export type TravelStatus = { kind: 'before' } | { kind: 'during'; day: number } | { kind: 'after' };

/** Reisetag eines Datums ("JJJJ-MM-TT"): Tag 1 = Reisebeginn. Kann ≤ 0 sein (vor der Reise). */
export function tripDayNumber(ymd: string, start: string = SITE.tripStart): number {
  return daysBetween(start, ymd) + 1;
}

/** Status für ein Datum ("JJJJ-MM-TT"). */
export function travelStatus(
  ymd: string,
  start: string = SITE.tripStart,
  end: string = SITE.tripEnd,
): TravelStatus {
  if (ymd < start) return { kind: 'before' };
  if (ymd >= end) return { kind: 'after' };
  return { kind: 'during', day: tripDayNumber(ymd, start) };
}

/** Anzeigetext der Reisetag-Anzeige. */
export function travelText(status: TravelStatus, start: string = SITE.tripStart): string {
  switch (status.kind) {
    case 'before':
      return `Los geht's am ${formatDateDe(start)}`;
    case 'after':
      return 'Reise beendet · wieder zurück in Alemania';
    default:
      return `Tag ${status.day} unterwegs`;
  }
}

/** Heutiges Datum in der Zeitzone der Reise. */
export function todayOnTrip(now: Date = new Date()): string {
  return todayInTimeZone(now, SITE.timeZone);
}

/**
 * Text für jetzt (oder ein Vorschau-Datum, z. B. aus ?datum=2026-12-24).
 * Ungültige Vorschau-Daten werden ignoriert.
 */
export function travelTextFor(now: Date = new Date(), previewDate?: string | null): string {
  const ymd = previewDate && isYmd(previewDate) ? previewDate : todayOnTrip(now);
  return travelText(travelStatus(ymd));
}

/** Letzter Reisetag (für Texte), z. B. "2. Februar 2027". */
export function lastTripDayLabel(): string {
  const [y, m, d] = SITE.tripEnd.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return formatDateDe(last);
}
