import { describe, expect, it } from 'vitest';
import { expandEvent, occursOn } from './recurrence';
import { fromLocal, minutesBetween, startOfDublinDay, toTimeKey } from './time';
import { makeEvent } from './testUtils';

const range = (from: string, to: string) => [startOfDublinDay(from), startOfDublinDay(to)] as const;

describe('recurrence', () => {
  it('a single event appears only once', () => {
    const ev = makeEvent({ id: 'a' });
    expect(expandEvent(ev, ...range('2026-10-01', '2026-11-01'))).toHaveLength(1);
  });

  it('weekly on Mon + Wed', () => {
    const ev = makeEvent({
      id: 'a',
      recurrence: { freq: 'weekly', interval: 1, weekdays: [1, 3], until: '', exceptions: [] },
    });
    const occ = expandEvent(ev, ...range('2026-10-12', '2026-10-26'));
    expect(occ.map((o) => o.date)).toEqual(['2026-10-12', '2026-10-14', '2026-10-19', '2026-10-21']);
  });

  it('every 2 weeks, with an "until" date and a skipped date', () => {
    const ev = makeEvent({
      id: 'a',
      recurrence: { freq: 'weekly', interval: 2, weekdays: [1], until: '2026-11-23', exceptions: ['2026-10-26'] },
    });
    const occ = expandEvent(ev, ...range('2026-10-01', '2027-01-01'));
    expect(occ.map((o) => o.date)).toEqual(['2026-10-12', '2026-11-09', '2026-11-23']);
  });

  it('daily every 3 days', () => {
    const ev = makeEvent({
      id: 'a',
      recurrence: { freq: 'daily', interval: 3, weekdays: [], until: '', exceptions: [] },
    });
    expect(occursOn(ev, '2026-10-15')).toBe(true);
    expect(occursOn(ev, '2026-10-16')).toBe(false);
    expect(occursOn(ev, '2026-10-11')).toBe(false); // before the start
  });

  it('a weekly 09:00 lecture stays at 09:00 local time across the October DST change', () => {
    const ev = makeEvent({
      id: 'lecture',
      startDate: '2026-10-19',
      endDate: '2026-10-19',
      recurrence: { freq: 'weekly', interval: 1, weekdays: [1], until: '', exceptions: [] },
    });
    const [before, after] = expandEvent(ev, ...range('2026-10-19', '2026-10-27'));
    expect(toTimeKey(before.start)).toBe('09:00');
    expect(toTimeKey(after.start)).toBe('09:00');
    expect(before.start.toUTC().hour).toBe(8); // IST
    expect(after.start.toUTC().hour).toBe(9); // GMT
  });

  it('an overnight shift during the October change lasts 9 real hours (22:00→06:00)', () => {
    const ev = makeEvent({
      id: 'shift',
      kind: 'work',
      startDate: '2026-10-24',
      startTime: '22:00',
      endDate: '2026-10-25',
      endTime: '06:00',
    });
    const [occ] = expandEvent(ev, ...range('2026-10-24', '2026-10-26'));
    expect(minutesBetween(occ.start, occ.end)).toBe(9 * 60);
  });

  it('a repeating overnight shift keeps its local times and is found from the next day', () => {
    const ev = makeEvent({
      id: 'shift',
      kind: 'work',
      startDate: '2026-10-09',
      startTime: '22:00',
      endDate: '2026-10-10',
      endTime: '06:00',
      recurrence: { freq: 'weekly', interval: 1, weekdays: [5], until: '', exceptions: [] },
    });
    // Looking only at Saturday 17 Oct should still show the Friday-night shift.
    const occ = expandEvent(ev, fromLocal('2026-10-17', '00:00'), fromLocal('2026-10-18', '00:00'));
    expect(occ).toHaveLength(1);
    expect(occ[0].date).toBe('2026-10-16');
    expect(toTimeKey(occ[0].end)).toBe('06:00');
  });
});
