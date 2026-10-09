import type { DateTime } from 'luxon';
import type { DateKey, ScheduleEvent, Settings, StudyTask } from './types';
import { expandAll, type Occurrence } from './recurrence';
import { addDays, fromLocal, startOfDublinDay } from './time';
import { planTravel } from './travel';

export function occurrencesForDay(events: ScheduleEvent[], date: DateKey): Occurrence[] {
  const from = startOfDublinDay(date);
  const to = startOfDublinDay(addDays(date, 1));
  return expandAll(events, from, to);
}

interface Interval {
  start: number;
  end: number;
}

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const i of sorted) {
    const last = merged[merged.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else merged.push({ ...i });
  }
  return merged;
}

/**
 * Busy time for a day: each event is busy from "leave home" until it ends,
 * plus the trip home after the last event of the day.
 */
export function busyIntervals(occurrences: Occurrence[]): Interval[] {
  const sorted = [...occurrences].sort((a, b) => a.start.toMillis() - b.start.toMillis());
  const list: Interval[] = sorted.map((occ) => ({
    start: planTravel(occ, 0).leaveAt.toMillis(),
    end: occ.end.toMillis(),
  }));
  const last = sorted.reduce<Occurrence | undefined>(
    (acc, o) => (!acc || o.end > acc.end ? o : acc),
    undefined,
  );
  if (last) {
    const travel = Math.max(0, last.event.travelMinutes || 0);
    list.push({ start: last.end.toMillis(), end: last.end.toMillis() + travel * 60000 });
  }
  return mergeIntervals(list);
}

export interface FreeTime {
  /** Free minutes within the whole day window (settings.dayStart … dayEnd). */
  totalMinutes: number;
  /** Free minutes from `now` until the end of the window (only for today). */
  remainingMinutes: number;
}

export function dayWindow(date: DateKey, settings: Settings): { start: DateTime; end: DateTime } {
  const start = fromLocal(date, settings.dayStart);
  let end = fromLocal(date, settings.dayEnd);
  if (end <= start) end = fromLocal(addDays(date, 1), settings.dayEnd);
  return { start, end };
}

function freeWithin(busy: Interval[], from: number, to: number): number {
  if (to <= from) return 0;
  let free = to - from;
  for (const b of busy) {
    const s = Math.max(b.start, from);
    const e = Math.min(b.end, to);
    if (e > s) free -= e - s;
  }
  return Math.max(0, Math.round(free / 60000));
}

export function freeTime(
  occurrences: Occurrence[],
  date: DateKey,
  settings: Settings,
  now: DateTime,
): FreeTime {
  const { start, end } = dayWindow(date, settings);
  const busy = busyIntervals(occurrences);
  const totalMinutes = freeWithin(busy, start.toMillis(), end.toMillis());
  const remainingFrom = Math.max(start.toMillis(), now.toMillis());
  const remainingMinutes = freeWithin(busy, remainingFrom, end.toMillis());
  return { totalMinutes, remainingMinutes };
}

/**
 * The current or next class/work shift, looking up to `daysAhead` days ahead.
 * Falls back to any event kind if there is no class or shift.
 */
export function nextCommitment(
  events: ScheduleEvent[],
  now: DateTime,
  daysAhead = 14,
): Occurrence | undefined {
  const upcoming = expandAll(events, now, now.plus({ days: daysAhead })).filter((o) => o.end > now);
  return upcoming.find((o) => o.event.kind !== 'other') ?? upcoming[0];
}

/** The next upcoming occurrence that still requires leaving home. */
export function nextDeparture(
  events: ScheduleEvent[],
  now: DateTime,
  daysAhead = 14,
): Occurrence | undefined {
  return expandAll(events, now, now.plus({ days: daysAhead })).find((o) => o.start > now);
}

// ---------- Tasks ----------

export function taskDeadline(task: StudyTask): DateTime {
  return fromLocal(task.deadlineDate, task.deadlineTime);
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Open tasks sorted by deadline, then priority. */
export function upcomingDeadlines(tasks: StudyTask[]): StudyTask[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .sort(
      (a, b) =>
        taskDeadline(a).toMillis() - taskDeadline(b).toMillis() ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    );
}

/** The most urgent open task whose deadline has not passed yet (or the oldest overdue one). */
export function nextTask(tasks: StudyTask[], now: DateTime): StudyTask | undefined {
  const open = upcomingDeadlines(tasks);
  return open.find((t) => taskDeadline(t) > now) ?? open[0];
}

export type DeadlineUrgency = 'overdue' | 'today' | 'soon' | 'later';

export function deadlineUrgency(task: StudyTask, now: DateTime): DeadlineUrgency {
  const d = taskDeadline(task);
  if (d <= now) return 'overdue';
  const hours = d.diff(now, 'hours').hours;
  if (hours <= 24) return 'today';
  if (hours <= 72) return 'soon';
  return 'later';
}
