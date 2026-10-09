import type { DateTime } from 'luxon';
import type { ScheduleEvent } from './types';
import { expandAll, expandEvent, type Occurrence } from './recurrence';

export interface Overlap {
  a: Occurrence;
  b: Occurrence;
  minutes: number;
}

export function overlaps(a: Occurrence, b: Occurrence): boolean {
  return a.start < b.end && b.start < a.end;
}

function overlapMinutes(a: Occurrence, b: Occurrence): number {
  const start = Math.max(a.start.toMillis(), b.start.toMillis());
  const end = Math.min(a.end.toMillis(), b.end.toMillis());
  return Math.max(0, Math.round((end - start) / 60000));
}

/** All pairs of overlapping occurrences (touching end-to-start is not a conflict). */
export function findOverlaps(occurrences: Occurrence[]): Overlap[] {
  const sorted = [...occurrences].sort((x, y) => x.start.toMillis() - y.start.toMillis());
  const result: Overlap[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break;
      if (sorted[i].event.id === sorted[j].event.id) continue;
      result.push({ a: sorted[i], b: sorted[j], minutes: overlapMinutes(sorted[i], sorted[j]) });
    }
  }
  return result;
}

/** Set of occurrence keys that are involved in at least one overlap. */
export function conflictKeys(occurrences: Occurrence[]): Set<string> {
  const keys = new Set<string>();
  for (const o of findOverlaps(occurrences)) {
    keys.add(o.a.key);
    keys.add(o.b.key);
  }
  return keys;
}

/**
 * Checks a new/edited event against all other events within a time horizon.
 * Used by the event form to warn before saving.
 */
export function conflictsForEvent(
  candidate: ScheduleEvent,
  others: ScheduleEvent[],
  from: DateTime,
  to: DateTime,
): Overlap[] {
  const mine = expandEvent(candidate, from, to);
  if (mine.length === 0) return [];
  const theirs = expandAll(others.filter((e) => e.id !== candidate.id), from, to);
  const result: Overlap[] = [];
  for (const a of mine) {
    for (const b of theirs) {
      if (b.start >= a.end) break;
      if (overlaps(a, b)) result.push({ a, b, minutes: overlapMinutes(a, b) });
    }
  }
  return result;
}
