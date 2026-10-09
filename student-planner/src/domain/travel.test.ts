import { describe, expect, it } from 'vitest';
import { analyzeDay, analyzeTransition, planTravel } from './travel';
import { expandAll, expandEvent } from './recurrence';
import { minutesBetween, startOfDublinDay, toTimeKey } from './time';
import { makeEvent } from './testUtils';

const day = (d: string) => [startOfDublinDay(d), startOfDublinDay(d).plus({ days: 1 })] as const;

describe('travel planning', () => {
  it('leave = start − travel − buffer; prepare = leave − prep time', () => {
    const ev = makeEvent({ id: 'a', startTime: '09:00', travelMinutes: 40, bufferMinutes: 10 });
    const [occ] = expandEvent(ev, ...day('2026-10-12'));
    const plan = planTravel(occ, 30);
    expect(toTimeKey(plan.arriveBy)).toBe('08:50');
    expect(toTimeKey(plan.leaveAt)).toBe('08:10');
    expect(toTimeKey(plan.prepareAt)).toBe('07:40');
  });

  it('crosses midnight correctly', () => {
    const ev = makeEvent({ id: 'a', startTime: '00:30', endTime: '06:00', travelMinutes: 45 });
    const [occ] = expandEvent(ev, ...day('2026-10-12'));
    const plan = planTravel(occ, 0);
    expect(plan.leaveAt.toISODate()).toBe('2026-10-11');
    expect(toTimeKey(plan.leaveAt)).toBe('23:45');
  });

  it('uses real elapsed time over the October DST change', () => {
    // On 25 Oct 2026 clocks go back at 02:00 IST -> 01:00 GMT.
    // Shift at 02:00 (GMT) with 2 h travel: leave at 00:00 UTC, which is 01:00 IST
    // on the wall clock: only 1 h earlier "on the clock" but 2 real hours earlier.
    const ev = makeEvent({
      id: 'a',
      startDate: '2026-10-25',
      endDate: '2026-10-25',
      startTime: '02:00',
      endTime: '08:00',
      travelMinutes: 120,
    });
    const [occ] = expandEvent(ev, ...day('2026-10-25'));
    const plan = planTravel(occ, 0);
    expect(minutesBetween(plan.leaveAt, occ.start)).toBe(120);
    expect(plan.leaveAt.toUTC().toFormat('HH:mm')).toBe('00:00');
    expect(toTimeKey(plan.leaveAt)).toBe('01:00');
  });

  it('ignores negative / invalid travel values', () => {
    const ev = makeEvent({ id: 'a', travelMinutes: -5, bufferMinutes: Number.NaN });
    const [occ] = expandEvent(ev, ...day('2026-10-12'));
    const plan = planTravel(occ, 0);
    expect(plan.leaveAt.toMillis()).toBe(occ.start.toMillis());
  });
});

describe('lateness risk between events', () => {
  const lecture = makeEvent({ id: 'lecture', location: 'TU Dublin Grangegorman', startTime: '09:00', endTime: '12:00' });

  it('ok when there is enough time to travel', () => {
    const shift = makeEvent({ id: 'shift', location: 'Cafe', startTime: '13:00', endTime: '18:00', travelMinutes: 30, bufferMinutes: 10 });
    const [t] = analyzeDay(expandAll([lecture, shift], ...day('2026-10-12')));
    expect(t.gapMinutes).toBe(60);
    expect(t.neededMinutes).toBe(40);
    expect(t.risk).toBe('ok');
  });

  it('tight when spare time is under 15 minutes', () => {
    const shift = makeEvent({ id: 'shift', location: 'Cafe', startTime: '12:45', endTime: '18:00', travelMinutes: 30, bufferMinutes: 5 });
    const [t] = analyzeDay(expandAll([lecture, shift], ...day('2026-10-12')));
    expect(t.spareMinutes).toBe(10);
    expect(t.risk).toBe('tight');
  });

  it('late when the gap is shorter than the travel time', () => {
    const shift = makeEvent({ id: 'shift', location: 'Cafe', startTime: '12:15', endTime: '18:00', travelMinutes: 30 });
    const [t] = analyzeDay(expandAll([lecture, shift], ...day('2026-10-12')));
    expect(t.risk).toBe('late');
    expect(t.spareMinutes).toBe(-15);
  });

  it('overlap when events intersect', () => {
    const shift = makeEvent({ id: 'shift', location: 'Cafe', startTime: '11:30', endTime: '18:00' });
    const [t] = analyzeDay(expandAll([lecture, shift], ...day('2026-10-12')));
    expect(t.risk).toBe('overlap');
  });

  it('no travel needed when both events are at the same place', () => {
    const tutorial = makeEvent({ id: 'tut', location: ' tu dublin grangegorman ', startTime: '12:00', endTime: '13:00', travelMinutes: 40 });
    const occ = expandAll([lecture, tutorial], ...day('2026-10-12'));
    const t = analyzeTransition(occ[0], occ[1]);
    expect(t.neededMinutes).toBe(0);
    expect(t.risk).toBe('tight'); // 0 minutes spare is still tight
  });
});
