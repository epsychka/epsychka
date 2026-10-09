import type { ScheduleEvent, StudyTask } from './types';

/** Test helper: builds an event with sensible defaults. */
export function makeEvent(partial: Partial<ScheduleEvent> & { id: string }): ScheduleEvent {
  return {
    kind: 'class',
    title: partial.id,
    location: '',
    startDate: '2026-10-12',
    startTime: '09:00',
    endDate: partial.startDate ?? '2026-10-12',
    endTime: '10:00',
    travelMinutes: 0,
    bufferMinutes: 0,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
    recurrence: {
      freq: 'none',
      interval: 1,
      weekdays: [],
      until: '',
      exceptions: [],
      ...partial.recurrence,
    },
  };
}

export function makeTask(partial: Partial<StudyTask> & { id: string }): StudyTask {
  return {
    title: partial.id,
    module: '',
    deadlineDate: '2026-10-20',
    deadlineTime: '23:59',
    priority: 'medium',
    estimatedHours: 1,
    status: 'todo',
    notes: '',
    checklist: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}
