import { describe, expect, it } from 'vitest';
import {
  lastTripDayLabel,
  todayOnTrip,
  travelStatus,
  travelText,
  travelTextFor,
  tripDayNumber,
} from '../../src/lib/travelDay';

const text = (ymd: string) => travelText(travelStatus(ymd));

describe('Reisetag', () => {
  it('vor dem Start', () => {
    expect(text('2026-11-22')).toBe("Los geht's am 23. November 2026");
    expect(text('2025-01-01')).toBe("Los geht's am 23. November 2026");
  });

  it('Tag 1 ist der 23. November 2026', () => {
    expect(text('2026-11-23')).toBe('Tag 1 unterwegs');
    expect(tripDayNumber('2026-11-23')).toBe(1);
  });

  it('Monats- und Jahreswechsel', () => {
    expect(text('2026-11-30')).toBe('Tag 8 unterwegs');
    expect(text('2026-12-01')).toBe('Tag 9 unterwegs');
    expect(text('2026-12-31')).toBe('Tag 39 unterwegs');
    expect(text('2027-01-01')).toBe('Tag 40 unterwegs');
    expect(text('2027-01-31')).toBe('Tag 70 unterwegs');
    expect(text('2027-02-01')).toBe('Tag 71 unterwegs');
  });

  it('Tag 72 ist der 2. Februar 2027, ab 3. Februar beendet', () => {
    expect(text('2027-02-02')).toBe('Tag 72 unterwegs');
    expect(text('2027-02-03')).toBe('Reise beendet · wieder zurück in Alemania');
    expect(text('2027-06-01')).toBe('Reise beendet · wieder zurück in Alemania');
    expect(lastTripDayLabel()).toBe('2. Februar 2027');
  });

  it('Zeitzonengrenzen: zählt nach Ortszeit Mexiko-Stadt (UTC−6)', () => {
    // 23.11. 05:59 UTC = 22.11. 23:59 in Mexiko-Stadt
    expect(todayOnTrip(new Date('2026-11-23T05:59:00Z'))).toBe('2026-11-22');
    expect(travelTextFor(new Date('2026-11-23T05:59:00Z'))).toBe("Los geht's am 23. November 2026");
    // 23.11. 06:00 UTC = 23.11. 00:00 in Mexiko-Stadt
    expect(travelTextFor(new Date('2026-11-23T06:00:00Z'))).toBe('Tag 1 unterwegs');
    // In Deutschland ist schon der 1. Januar, in Mexiko noch Silvester
    expect(travelTextFor(new Date('2026-12-31T23:30:00Z'))).toBe('Tag 39 unterwegs');
    expect(travelTextFor(new Date('2027-02-03T05:59:59Z'))).toBe('Tag 72 unterwegs');
    expect(travelTextFor(new Date('2027-02-03T06:00:00Z'))).toBe(
      'Reise beendet · wieder zurück in Alemania',
    );
  });

  it('Vorschau-Datum, ungültige Vorschau wird ignoriert', () => {
    const now = new Date('2026-12-10T18:00:00Z');
    expect(travelTextFor(now, '2026-12-24')).toBe('Tag 32 unterwegs');
    expect(travelTextFor(now, '2026-02-30')).toBe('Tag 18 unterwegs');
    expect(travelTextFor(now, 'morgen')).toBe('Tag 18 unterwegs');
  });
});
