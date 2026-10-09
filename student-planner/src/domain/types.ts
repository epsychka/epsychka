// Core data model. Everything here is plain JSON so it can be stored
// locally today and synced to a cloud database (e.g. Supabase) later.

/** Calendar date in Europe/Dublin, format YYYY-MM-DD. */
export type DateKey = string;
/** Wall-clock time in Europe/Dublin, format HH:mm (24h). */
export type TimeKey = string;

export type EventKind = 'class' | 'work' | 'other';

export type RecurrenceFreq = 'none' | 'daily' | 'weekly';

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Every N days / weeks. 1 = every day / every week. */
  interval: number;
  /** ISO weekdays 1 (Mon) … 7 (Sun). Used only for weekly rules. */
  weekdays: number[];
  /** Last date (inclusive) on which the series may start. Empty = no end. */
  until: DateKey | '';
  /** Dates of individual occurrences that were skipped. */
  exceptions: DateKey[];
}

export interface ScheduleEvent {
  id: string;
  kind: EventKind;
  title: string;
  location: string;
  /** Start of the first occurrence (Dublin wall-clock time). */
  startDate: DateKey;
  startTime: TimeKey;
  /** End of the first occurrence (Dublin wall-clock time). */
  endDate: DateKey;
  endTime: TimeKey;
  /** Minutes needed to travel from home to the location. */
  travelMinutes: number;
  /** Extra safety margin in minutes before the start. */
  bufferMinutes: number;
  recurrence: Recurrence;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface StudyTask {
  id: string;
  title: string;
  module: string;
  deadlineDate: DateKey;
  deadlineTime: TimeKey;
  priority: TaskPriority;
  /** Estimated effort in hours. */
  estimatedHours: number;
  status: TaskStatus;
  notes: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export type Language = 'en' | 'ru';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  language: Language;
  theme: ThemeMode;
  /** Minutes to get ready before leaving home. */
  prepMinutes: number;
  defaultTravelUniMinutes: number;
  defaultTravelWorkMinutes: number;
  defaultBufferMinutes: number;
  /** The part of the day counted when calculating free hours. */
  dayStart: TimeKey;
  dayEnd: TimeKey;
}

export interface AppData {
  version: 1;
  events: ScheduleEvent[];
  tasks: StudyTask[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'system',
  prepMinutes: 30,
  defaultTravelUniMinutes: 40,
  defaultTravelWorkMinutes: 30,
  defaultBufferMinutes: 10,
  dayStart: '08:00',
  dayEnd: '22:00',
};

export function emptyData(): AppData {
  return { version: 1, events: [], tasks: [], settings: { ...DEFAULT_SETTINGS } };
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
