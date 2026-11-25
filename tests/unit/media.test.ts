import { describe, expect, it } from 'vitest';
import { formatDuration } from '../../src/lib/media';

describe('Laufzeit der Videokacheln', () => {
  it('formatiert als m:ss und rundet auf ganze Sekunden auf', () => {
    expect(formatDuration(2)).toBe('0:02');
    expect(formatDuration(12.4)).toBe('0:13');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(75.2)).toBe('1:16');
    expect(formatDuration(179.9)).toBe('3:00');
  });
  it('kommt mit 0 und negativen Werten zurecht', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(-3)).toBe('0:00');
  });
});
