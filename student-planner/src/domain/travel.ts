import type { DateTime } from 'luxon';
import type { Occurrence } from './recurrence';
import { minutesBetween } from './time';

export interface TravelPlan {
  /** When to start getting ready. */
  prepareAt: DateTime;
  /** When to walk out of the door. */
  leaveAt: DateTime;
  /** Planned arrival = start − buffer. */
  arriveBy: DateTime;
  travelMinutes: number;
  bufferMinutes: number;
}

function safeMinutes(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Leave time = start − travel − buffer. Preparation starts `prepMinutes` earlier.
 * Uses real elapsed time, so DST changes are handled correctly.
 */
export function planTravel(occ: Occurrence, prepMinutes: number): TravelPlan {
  const travelMinutes = safeMinutes(occ.event.travelMinutes);
  const bufferMinutes = safeMinutes(occ.event.bufferMinutes);
  const arriveBy = occ.start.minus({ minutes: bufferMinutes });
  const leaveAt = arriveBy.minus({ minutes: travelMinutes });
  const prepareAt = leaveAt.minus({ minutes: safeMinutes(prepMinutes) });
  return { prepareAt, leaveAt, arriveBy, travelMinutes, bufferMinutes };
}

export type TransitionRisk = 'overlap' | 'late' | 'tight' | 'ok';

export interface Transition {
  from: Occurrence;
  to: Occurrence;
  /** Free minutes between the end of `from` and the start of `to` (negative = overlap). */
  gapMinutes: number;
  /** Minutes needed to get from `from` to `to` (travel + buffer). */
  neededMinutes: number;
  /** gap − needed. Negative means you will probably be late. */
  spareMinutes: number;
  risk: TransitionRisk;
}

/** A gap shorter than needed + this margin is shown as "tight". */
export const TIGHT_MARGIN_MINUTES = 15;

function sameLocation(a: Occurrence, b: Occurrence): boolean {
  const la = a.event.location.trim().toLowerCase();
  const lb = b.event.location.trim().toLowerCase();
  return la !== '' && la === lb;
}

/**
 * Travel needed between two consecutive events.
 * Same location → no travel. Otherwise we use the travel time of the next event
 * (entered as "from home"). This is an estimate until a transport API is added.
 */
export function neededBetween(from: Occurrence, to: Occurrence): number {
  if (sameLocation(from, to)) return 0;
  return safeMinutes(to.event.travelMinutes) + safeMinutes(to.event.bufferMinutes);
}

export function analyzeTransition(from: Occurrence, to: Occurrence): Transition {
  const gapMinutes = minutesBetween(from.end, to.start);
  const neededMinutes = neededBetween(from, to);
  const spareMinutes = gapMinutes - neededMinutes;
  let risk: TransitionRisk = 'ok';
  if (gapMinutes < 0) risk = 'overlap';
  else if (spareMinutes < 0) risk = 'late';
  else if (spareMinutes < TIGHT_MARGIN_MINUTES) risk = 'tight';
  return { from, to, gapMinutes, neededMinutes, spareMinutes, risk };
}

/** Transitions between each pair of consecutive occurrences (sorted by start). */
export function analyzeDay(occurrences: Occurrence[]): Transition[] {
  const sorted = [...occurrences].sort((a, b) => a.start.toMillis() - b.start.toMillis());
  const result: Transition[] = [];
  for (let i = 1; i < sorted.length; i++) {
    result.push(analyzeTransition(sorted[i - 1], sorted[i]));
  }
  return result;
}
