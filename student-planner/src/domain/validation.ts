import type {
  AppData,
  ChecklistItem,
  EventKind,
  Recurrence,
  ScheduleEvent,
  Settings,
  StudyTask,
  TaskPriority,
  TaskStatus,
} from './types';
import { DEFAULT_SETTINGS, newId } from './types';
import { compareLocal, isDateKey, isTimeKey } from './time';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number, min = 0, max = 100000): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

export function sanitizeRecurrence(v: unknown): Recurrence {
  const r = isObj(v) ? v : {};
  return {
    freq: oneOf(r.freq, ['none', 'daily', 'weekly'] as const, 'none'),
    interval: Math.round(num(r.interval, 1, 1, 52)),
    weekdays: Array.isArray(r.weekdays)
      ? [...new Set(r.weekdays.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort()
      : [],
    until: isDateKey(r.until) ? r.until : '',
    exceptions: Array.isArray(r.exceptions) ? r.exceptions.filter(isDateKey) : [],
  };
}

/** Returns a clean event, or null if the essential fields are broken. */
export function sanitizeEvent(v: unknown): ScheduleEvent | null {
  if (!isObj(v)) return null;
  const { startDate, startTime, endDate, endTime } = v;
  if (!isDateKey(startDate) || !isTimeKey(startTime) || !isDateKey(endDate) || !isTimeKey(endTime)) {
    return null;
  }
  if (compareLocal(startDate, startTime, endDate, endTime) >= 0) return null;
  const title = str(v.title).trim();
  if (!title) return null;
  const now = new Date().toISOString();
  return {
    id: str(v.id) || newId(),
    kind: oneOf<EventKind>(v.kind, ['class', 'work', 'other'], 'other'),
    title,
    location: str(v.location),
    startDate,
    startTime,
    endDate,
    endTime,
    travelMinutes: Math.round(num(v.travelMinutes, 0, 0, 600)),
    bufferMinutes: Math.round(num(v.bufferMinutes, 0, 0, 600)),
    recurrence: sanitizeRecurrence(v.recurrence),
    notes: str(v.notes),
    createdAt: str(v.createdAt, now),
    updatedAt: str(v.updatedAt, now),
  };
}

function sanitizeChecklist(v: unknown): ChecklistItem[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObj).map((i) => ({
    id: str(i.id) || newId(),
    text: str(i.text),
    done: i.done === true,
  }));
}

export function sanitizeTask(v: unknown): StudyTask | null {
  if (!isObj(v)) return null;
  const title = str(v.title).trim();
  if (!title || !isDateKey(v.deadlineDate)) return null;
  const now = new Date().toISOString();
  return {
    id: str(v.id) || newId(),
    title,
    module: str(v.module),
    deadlineDate: v.deadlineDate,
    deadlineTime: isTimeKey(v.deadlineTime) ? v.deadlineTime : '23:59',
    priority: oneOf<TaskPriority>(v.priority, ['low', 'medium', 'high'], 'medium'),
    estimatedHours: num(v.estimatedHours, 1, 0, 1000),
    status: oneOf<TaskStatus>(v.status, ['todo', 'in_progress', 'done'], 'todo'),
    notes: str(v.notes),
    checklist: sanitizeChecklist(v.checklist),
    createdAt: str(v.createdAt, now),
    updatedAt: str(v.updatedAt, now),
  };
}

export function sanitizeSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  const d = DEFAULT_SETTINGS;
  return {
    language: oneOf(s.language, ['en', 'ru'] as const, d.language),
    theme: oneOf(s.theme, ['system', 'light', 'dark'] as const, d.theme),
    prepMinutes: Math.round(num(s.prepMinutes, d.prepMinutes, 0, 600)),
    defaultTravelUniMinutes: Math.round(num(s.defaultTravelUniMinutes, d.defaultTravelUniMinutes, 0, 600)),
    defaultTravelWorkMinutes: Math.round(num(s.defaultTravelWorkMinutes, d.defaultTravelWorkMinutes, 0, 600)),
    defaultBufferMinutes: Math.round(num(s.defaultBufferMinutes, d.defaultBufferMinutes, 0, 600)),
    dayStart: isTimeKey(s.dayStart) ? s.dayStart : d.dayStart,
    dayEnd: isTimeKey(s.dayEnd) ? s.dayEnd : d.dayEnd,
  };
}

export interface SanitizeResult {
  data: AppData;
  /** Number of records that were broken and had to be skipped. */
  dropped: number;
}

/** Validates data loaded from storage or from an imported backup file. */
export function sanitizeAppData(v: unknown): SanitizeResult | null {
  if (!isObj(v) || !Array.isArray(v.events) || !Array.isArray(v.tasks)) return null;
  const events = v.events.map(sanitizeEvent);
  const tasks = v.tasks.map(sanitizeTask);
  const cleanEvents = events.filter((e): e is ScheduleEvent => e !== null);
  const cleanTasks = tasks.filter((t): t is StudyTask => t !== null);
  return {
    data: {
      version: 1,
      events: cleanEvents,
      tasks: cleanTasks,
      settings: sanitizeSettings(v.settings),
    },
    dropped: events.length - cleanEvents.length + tasks.length - cleanTasks.length,
  };
}
