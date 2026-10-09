import { DateTime } from 'luxon';
import type { DateKey, TimeKey } from './types';

/** All schedule maths happens in this zone, including DST changes. */
export const ZONE = 'Europe/Dublin';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateKey(v: unknown): v is DateKey {
  return typeof v === 'string' && DATE_RE.test(v) && DateTime.fromISO(v, { zone: 'utc' }).isValid;
}

export function isTimeKey(v: unknown): v is TimeKey {
  return typeof v === 'string' && TIME_RE.test(v);
}

export function nowInDublin(): DateTime {
  return DateTime.now().setZone(ZONE);
}

/**
 * Turns a Dublin wall-clock date + time into an exact moment.
 * A time that does not exist (skipped by the spring DST change, e.g. 01:30
 * on the last Sunday of March) is moved forward by Luxon to 02:30.
 */
export function fromLocal(date: DateKey, time: TimeKey): DateTime {
  return DateTime.fromISO(`${date}T${time}`, { zone: ZONE });
}

export function toDateKey(dt: DateTime): DateKey {
  return dt.setZone(ZONE).toISODate() ?? '';
}

export function toTimeKey(dt: DateTime): TimeKey {
  return dt.setZone(ZONE).toFormat('HH:mm');
}

export function startOfDublinDay(date: DateKey): DateTime {
  return DateTime.fromISO(date, { zone: ZONE }).startOf('day');
}

/** Pure calendar arithmetic on YYYY-MM-DD keys (no time-zone effects). */
export function addDays(date: DateKey, days: number): DateKey {
  return DateTime.fromISO(date, { zone: 'utc' }).plus({ days }).toISODate() ?? date;
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const da = DateTime.fromISO(a, { zone: 'utc' });
  const db = DateTime.fromISO(b, { zone: 'utc' });
  return Math.round(db.diff(da, 'days').days);
}

/** ISO weekday 1 (Mon) … 7 (Sun). */
export function weekdayOf(date: DateKey): number {
  return DateTime.fromISO(date, { zone: 'utc' }).weekday;
}

/** Monday of the week that contains the date. */
export function mondayOf(date: DateKey): DateKey {
  return addDays(date, 1 - weekdayOf(date));
}

/** Real elapsed minutes between two moments (DST-aware). */
export function minutesBetween(a: DateTime, b: DateTime): number {
  return Math.round(b.diff(a, 'minutes').minutes);
}

export function compareLocal(aDate: DateKey, aTime: TimeKey, bDate: DateKey, bTime: TimeKey): number {
  const a = `${aDate}T${aTime}`;
  const b = `${bDate}T${bTime}`;
  return a < b ? -1 : a > b ? 1 : 0;
}
