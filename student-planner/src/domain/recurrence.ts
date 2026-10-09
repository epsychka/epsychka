import type { DateTime } from 'luxon';
import type { DateKey, ScheduleEvent } from './types';
import { addDays, daysBetween, fromLocal, mondayOf, toDateKey, weekdayOf } from './time';

/** One concrete instance of a (possibly repeating) event. */
export interface Occurrence {
  /** Unique key: event id + date of this occurrence. */
  key: string;
  event: ScheduleEvent;
  /** Date (Dublin) on which this occurrence starts. */
  date: DateKey;
  start: DateTime;
  end: DateTime;
}

/** Number of calendar days between the event's start date and end date. */
export function spanDays(ev: ScheduleEvent): number {
  return Math.max(0, daysBetween(ev.startDate, ev.endDate));
}

/** Does the series have an occurrence starting on this date? */
export function occursOn(ev: ScheduleEvent, date: DateKey): boolean {
  if (date < ev.startDate) return false;
  const r = ev.recurrence;
  if (r.exceptions.includes(date)) return false;
  if (r.freq === 'none') return date === ev.startDate;
  if (r.until && date > r.until) return false;
  const interval = Math.max(1, Math.floor(r.interval) || 1);

  if (r.freq === 'daily') {
    return daysBetween(ev.startDate, date) % interval === 0;
  }
  // weekly
  const weekdays = r.weekdays.length > 0 ? r.weekdays : [weekdayOf(ev.startDate)];
  if (!weekdays.includes(weekdayOf(date))) return false;
  const weeks = Math.round(daysBetween(mondayOf(ev.startDate), mondayOf(date)) / 7);
  return weeks % interval === 0;
}

/** Builds the occurrence that starts on `date` (caller checks occursOn). */
export function occurrenceOn(ev: ScheduleEvent, date: DateKey): Occurrence {
  const start = fromLocal(date, ev.startTime);
  let end = fromLocal(addDays(date, spanDays(ev)), ev.endTime);
  // Safety net for invalid data: never produce negative-length occurrences.
  if (end <= start) end = start.plus({ minutes: 1 });
  return { key: `${ev.id}@${date}`, event: ev, date, start, end };
}

/**
 * All occurrences that overlap the interval [from, to).
 * Works day by day on Dublin calendar dates, so a weekly 09:00 lecture stays
 * at 09:00 local time on both sides of a daylight-saving change.
 */
export function expandEvent(ev: ScheduleEvent, from: DateTime, to: DateTime): Occurrence[] {
  const result: Occurrence[] = [];
  const firstDate = toDateKey(from);
  const lastDate = toDateKey(to);
  // Start a little earlier so multi-day events that began before `from` are included.
  let date = addDays(firstDate, -(spanDays(ev) + 1));
  if (date < ev.startDate) date = ev.startDate;
  const last = ev.recurrence.freq !== 'none' && ev.recurrence.until && ev.recurrence.until < lastDate
    ? ev.recurrence.until
    : lastDate;

  // Hard cap protects the UI from accidental huge ranges.
  for (let i = 0; date <= last && i < 3700; i++, date = addDays(date, 1)) {
    if (!occursOn(ev, date)) continue;
    const occ = occurrenceOn(ev, date);
    if (occ.start < to && occ.end > from) result.push(occ);
    if (ev.recurrence.freq === 'none') break;
  }
  return result;
}

export function expandAll(events: ScheduleEvent[], from: DateTime, to: DateTime): Occurrence[] {
  return events
    .flatMap((ev) => expandEvent(ev, from, to))
    .sort((a, b) => a.start.toMillis() - b.start.toMillis() || a.end.toMillis() - b.end.toMillis());
}
