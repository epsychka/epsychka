import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, fromLocal, minutesBetween, mondayOf, toTimeKey, weekdayOf } from './time';

describe('Europe/Dublin time helpers', () => {
  it('uses GMT+1 (IST) in summer and GMT in winter', () => {
    expect(fromLocal('2026-07-01', '09:00').toUTC().toFormat('HH:mm')).toBe('08:00');
    expect(fromLocal('2026-12-01', '09:00').toUTC().toFormat('HH:mm')).toBe('09:00');
  });

  it('autumn change (25 Oct 2026): the night is one hour longer', () => {
    const before = fromLocal('2026-10-25', '00:00');
    const after = fromLocal('2026-10-25', '03:00');
    expect(minutesBetween(before, after)).toBe(4 * 60);
  });

  it('spring change (29 Mar 2026): the night is one hour shorter', () => {
    const before = fromLocal('2026-03-29', '00:00');
    const after = fromLocal('2026-03-29', '03:00');
    expect(minutesBetween(before, after)).toBe(2 * 60);
  });

  it('a non-existent spring time (01:30) is moved forward, not crashed', () => {
    const dt = fromLocal('2026-03-29', '01:30');
    expect(dt.isValid).toBe(true);
    expect(toTimeKey(dt)).toBe('02:30');
  });

  it('calendar arithmetic is not affected by DST', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(daysBetween('2026-10-20', '2026-10-27')).toBe(7);
    expect(weekdayOf('2026-10-12')).toBe(1); // Monday
    expect(mondayOf('2026-10-18')).toBe('2026-10-12'); // Sunday → previous Monday
  });
});
