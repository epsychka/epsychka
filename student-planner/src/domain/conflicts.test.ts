import { describe, expect, it } from 'vitest';
import { conflictKeys, conflictsForEvent, findOverlaps } from './conflicts';
import { expandAll } from './recurrence';
import { startOfDublinDay } from './time';
import { makeEvent } from './testUtils';

const from = startOfDublinDay('2026-10-01');
const to = startOfDublinDay('2027-01-01');

describe('conflict detection', () => {
  it('finds overlapping events', () => {
    const a = makeEvent({ id: 'a', startTime: '09:00', endTime: '11:00' });
    const b = makeEvent({ id: 'b', startTime: '10:30', endTime: '12:00' });
    const overlaps = findOverlaps(expandAll([a, b], from, to));
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].minutes).toBe(30);
  });

  it('back-to-back events are not a conflict', () => {
    const a = makeEvent({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const b = makeEvent({ id: 'b', startTime: '10:00', endTime: '11:00' });
    expect(findOverlaps(expandAll([a, b], from, to))).toHaveLength(0);
  });

  it('detects a conflict between a weekly class and a one-off shift weeks later', () => {
    const lecture = makeEvent({
      id: 'lecture',
      startTime: '14:00',
      endTime: '16:00',
      recurrence: { freq: 'weekly', interval: 1, weekdays: [3], until: '', exceptions: [] },
    });
    const shift = makeEvent({
      id: 'shift',
      kind: 'work',
      startDate: '2026-11-04', // a Wednesday
      endDate: '2026-11-04',
      startTime: '15:00',
      endTime: '20:00',
    });
    const result = conflictsForEvent(shift, [lecture], from, to);
    expect(result).toHaveLength(1);
    expect(result[0].b.event.id).toBe('lecture');
    expect(result[0].minutes).toBe(60);
  });

  it('ignores the event being edited itself', () => {
    const a = makeEvent({ id: 'a' });
    expect(conflictsForEvent(a, [a], from, to)).toHaveLength(0);
  });

  it('marks every occurrence involved in a conflict', () => {
    const a = makeEvent({ id: 'a', startTime: '09:00', endTime: '12:00' });
    const b = makeEvent({ id: 'b', startTime: '10:00', endTime: '11:00' });
    const c = makeEvent({ id: 'c', startTime: '11:30', endTime: '13:00' });
    const d = makeEvent({ id: 'd', startTime: '14:00', endTime: '15:00' });
    const keys = conflictKeys(expandAll([a, b, c, d], from, to));
    expect([...keys].sort()).toEqual(['a@2026-10-12', 'b@2026-10-12', 'c@2026-10-12']);
  });
});
