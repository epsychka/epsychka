import type { AppData, DateKey, ScheduleEvent, Settings, StudyTask } from '../domain/types';

export type Action =
  | { type: 'replaceAll'; data: AppData }
  | { type: 'upsertEvent'; event: ScheduleEvent }
  | { type: 'deleteEvent'; id: string }
  | { type: 'skipOccurrence'; id: string; date: DateKey }
  | { type: 'upsertTask'; task: StudyTask }
  | { type: 'deleteTask'; id: string }
  | { type: 'updateSettings'; patch: Partial<Settings> };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = [...list];
  copy[i] = item;
  return copy;
}

export function reducer(state: AppData, action: Action): AppData {
  const now = new Date().toISOString();
  switch (action.type) {
    case 'replaceAll':
      return action.data;
    case 'upsertEvent':
      return { ...state, events: upsert(state.events, { ...action.event, updatedAt: now }) };
    case 'deleteEvent':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case 'skipOccurrence':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.id && !e.recurrence.exceptions.includes(action.date)
            ? {
                ...e,
                updatedAt: now,
                recurrence: { ...e.recurrence, exceptions: [...e.recurrence.exceptions, action.date] },
              }
            : e,
        ),
      };
    case 'upsertTask':
      return { ...state, tasks: upsert(state.tasks, { ...action.task, updatedAt: now }) };
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
  }
}
