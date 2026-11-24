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
    expect(text('2026-11-23')).toBe('Heute ist der 1. Tag der Reise');
    expect(tripDayNumber('2026-11-23')).toBe(1);
  });

  it('Monats- und Jahreswechsel', () => {
    expect(text('2026-11-30')).toBe('Heute ist der 8. Tag der Reise');
    expect(text('2026-12-01')).toBe('Heute ist der 9. Tag der Reise');
    expect(text('2026-12-31')).toBe('Heute ist der 39. Tag der Reise');
    expect(text('2027-01-01')).toBe('Heute ist der 40. Tag der Reise');
    expect(text('2027-01-31')).toBe('Heute ist der 70. Tag der Reise');
    expect(text('2027-02-01')).toBe('Heute ist der 71. Tag der Reise');
  });

  it('Tag 72 ist der 2. Februar 2027, ab 3. Februar beendet', () => {
    expect(text('2027-02-02')).toBe('Heute ist der 72. Tag der Reise');
    expect(text('2027-02-03')).toBe('Reise nach 72 Tagen beendet');
    expect(text('2027-06-01')).toBe('Reise nach 72 Tagen beendet');
    expect(lastTripDayLabel()).toBe('2. Februar 2027');
  });

  it('Zeitzonengrenzen: zählt nach Ortszeit Mexiko-Stadt (UTC−6)', () => {
    // 23.11. 05:59 UTC = 22.11. 23:59 in Mexiko-Stadt
    expect(todayOnTrip(new Date('2026-11-23T05:59:00Z'))).toBe('2026-11-22');
    expect(travelTextFor(new Date('2026-11-23T05:59:00Z'))).toBe("Los geht's am 23. November 2026");
    // 23.11. 06:00 UTC = 23.11. 00:00 in Mexiko-Stadt
    expect(travelTextFor(new Date('2026-11-23T06:00:00Z'))).toBe('Heute ist der 1. Tag der Reise');
    // In Deutschland ist schon der 1. Januar, in Mexiko noch Silvester
    expect(travelTextFor(new Date('2026-12-31T23:30:00Z'))).toBe('Heute ist der 39. Tag der Reise');
    expect(travelTextFor(new Date('2027-02-03T05:59:59Z'))).toBe('Heute ist der 72. Tag der Reise');
    expect(travelTextFor(new Date('2027-02-03T06:00:00Z'))).toBe('Reise nach 72 Tagen beendet');
  });

  it('Vorschau-Datum, ungültige Vorschau wird ignoriert', () => {
    const now = new Date('2026-12-10T18:00:00Z');
    expect(travelTextFor(now, '2026-12-24')).toBe('Heute ist der 32. Tag der Reise');
    expect(travelTextFor(now, '2026-02-30')).toBe('Heute ist der 18. Tag der Reise');
    expect(travelTextFor(now, 'morgen')).toBe('Heute ist der 18. Tag der Reise');
  });
});
