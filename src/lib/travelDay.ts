/**
 * Reisetag-Berechnung mit Datumswerten ohne Uhrzeit.
 * Der 23. November 2026 ist Tag 1.
 */
import { SITE } from '../config';
import { daysBetween } from './dates';

/** Reisetag eines Datums ("JJJJ-MM-TT"): Tag 1 = SITE.tripStart. Kann ≤ 0 sein (vor der Reise). */
export function tripDayNumber(ymd: string, start: string = SITE.tripStart): number {
  return daysBetween(start, ymd) + 1;
}
