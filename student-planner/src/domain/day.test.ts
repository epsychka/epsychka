import { describe, expect, it } from 'vitest';
import { deadlineUrgency, freeTime, nextCommitment, nextTask, occurrencesForDay, upcomingDeadlines } from './day';
import { fromLocal } from './time';
import { DEFAULT_SETTINGS } from './types';
import { makeEvent, makeTask } from './testUtils';

const settings = { ...DEFAULT_SETTINGS, dayStart: '08:00', dayEnd: '22:00' }; // 14 h window

describe('free time', () => {
  it('whole window is free on an empty day', () => {
    const now = fromLocal('2026-10-12', '07:00');
    expect(freeTime([], '2026-10-12', settings, now)).toEqual({ totalMinutes: 840, remainingMinutes: 840 });
  });

  it('subtracts travel, events and the trip home after the last event', () => {
    const a = makeEvent({ id: 'a', startTime: '10:00', endTime: '12:00', travelMinutes: 30, bufferMinutes: 10 });
    const b = makeEvent({ id: 'b', startTime: '14:00', endTime: '16:00', travelMinutes: 30 });
    const occ = occurrencesForDay([a, b], '2026-10-12');
    // busy: 09:20–12:00 (160) + 13:30–16:00 (150) + 16:00–16:30 home (30) = 340
    const now = fromLocal('2026-10-12', '13:00');
    const free = freeTime(occ, '2026-10-12', settings, now);
    expect(free.totalMinutes).toBe(840 - 340);
    // from 13:00: 13:00–13:30 + 16:30–22:00 = 30 + 330
    expect(free.remainingMinutes).toBe(360);
  });

  it('overlapping events are not double-counted', () => {
    const a = makeEvent({ id: 'a', startTime: '10:00', endTime: '12:00' });
    const b = makeEvent({ id: 'b', startTime: '11:00', endTime: '13:00' });
    const occ = occurrencesForDay([a, b], '2026-10-12');
    expect(freeTime(occ, '2026-10-12', settings, fromLocal('2026-10-12', '00:00')).totalMinutes).toBe(840 - 180);
  });

  it('DST day: 00:00–23:59 window on 25 Oct has an extra hour', () => {
    const s = { ...settings, dayStart: '00:00', dayEnd: '23:59' };
    const free = freeTime([], '2026-10-25', s, fromLocal('2026-10-24', '12:00'));
    expect(free.totalMinutes).toBe(24 * 60 + 59);
  });
});

describe('next commitment', () => {
  const lecture = makeEvent({
    id: 'lecture',
    startTime: '09:00',
    endTime: '11:00',
    recurrence: { freq: 'weekly', interval: 1, weekdays: [1], until: '', exceptions: [] },
  });
  const gym = makeEvent({ id: 'gym', kind: 'other', startTime: '08:00', endTime: '08:45', recurrence: { freq: 'daily', interval: 1, weekdays: [], until: '', exceptions: [] } });

  it('prefers classes/work over "other" events', () => {
    const now = fromLocal('2026-10-12', '07:00');
    expect(nextCommitment([gym, lecture], now)?.event.id).toBe('lecture');
  });

  it('returns an event that is happening right now', () => {
    const now = fromLocal('2026-10-12', '10:00');
    expect(nextCommitment([lecture], now)?.date).toBe('2026-10-12');
  });

  it('looks into next week when today is over', () => {
    const now = fromLocal('2026-10-12', '12:00');
    expect(nextCommitment([lecture], now)?.date).toBe('2026-10-19');
  });
});

describe('deadlines', () => {
  const now = fromLocal('2026-10-12', '12:00');
  const tasks = [
    makeTask({ id: 'later', deadlineDate: '2026-10-30' }),
    makeTask({ id: 'done', deadlineDate: '2026-10-13', status: 'done' }),
    makeTask({ id: 'overdue', deadlineDate: '2026-10-10' }),
    makeTask({ id: 'soonLow', deadlineDate: '2026-10-14', priority: 'low' }),
    makeTask({ id: 'soonHigh', deadlineDate: '2026-10-14', priority: 'high' }),
  ];

  it('sorts open tasks by deadline then priority and hides completed ones', () => {
    expect(upcomingDeadlines(tasks).map((t) => t.id)).toEqual(['overdue', 'soonHigh', 'soonLow', 'later']);
  });

  it('next task is the nearest one that is not overdue yet', () => {
    expect(nextTask(tasks, now)?.id).toBe('soonHigh');
  });

  it('urgency levels', () => {
    expect(deadlineUrgency(tasks[2], now)).toBe('overdue');
    expect(deadlineUrgency(makeTask({ id: 'x', deadlineDate: '2026-10-13', deadlineTime: '09:00' }), now)).toBe('today');
    expect(deadlineUrgency(tasks[3], now)).toBe('soon');
    expect(deadlineUrgency(tasks[0], now)).toBe('later');
  });
});
