import type { DateTime } from 'luxon';
import { deadlineUrgency, taskDeadline } from '../domain/day';
import type { Occurrence } from '../domain/recurrence';
import type { Transition } from '../domain/travel';
import type { StudyTask } from '../domain/types';
import { formatDayShort, formatTime, localeFor } from '../i18n';
import { useApp } from '../state/context';
import { Icon } from './Icon';

interface OccurrenceProps {
  occ: Occurrence;
  onOpen: (occ: Occurrence) => void;
  conflict?: boolean;
  /** Show the leave-home time under the event. */
  showLeave?: boolean;
  leaveAt?: DateTime;
  past?: boolean;
}

export function OccurrenceCard({ occ, onOpen, conflict, showLeave, leaveAt, past }: OccurrenceProps) {
  const { t, data } = useApp();
  const lang = data.settings.language;
  const ev = occ.event;
  const crossesDay = occ.end.toISODate() !== occ.start.toISODate();
  return (
    <button
      type="button"
      className={`occ-card kind-${ev.kind} ${conflict ? 'has-conflict' : ''} ${past ? 'is-past' : ''}`}
      onClick={() => onOpen(occ)}
    >
      <span className="occ-time">
        <strong>{formatTime(occ.start)}</strong>
        <span>
          {formatTime(occ.end)}
          {crossesDay && ` (${formatDayShort(occ.end, lang)})`}
        </span>
      </span>
      <span className="occ-main">
        <span className="occ-title">
          {ev.title}
          {ev.recurrence.freq !== 'none' && (
            <span className="occ-repeat" title={t('schedule.repeats')}>
              <Icon name="repeat" size={14} />
            </span>
          )}
        </span>
        <span className="occ-meta">
          <span className={`badge kind-${ev.kind}`}>{t(`kind.${ev.kind}`)}</span>
          {ev.location && (
            <span className="occ-location">
              <Icon name="pin" size={14} />
              {ev.location}
            </span>
          )}
        </span>
        {showLeave && leaveAt && ev.travelMinutes + ev.bufferMinutes > 0 && (
          <span className="occ-leave">
            <Icon name="walk" size={14} /> {t('today.leaveAt')} {formatTime(leaveAt)} · {t('today.travel', { min: ev.travelMinutes })}
          </span>
        )}
        {conflict && (
          <span className="occ-conflict">
            <Icon name="warning" size={14} /> {t('schedule.conflict')}
          </span>
        )}
      </span>
    </button>
  );
}

export function TransitionNote({ tr }: { tr: Transition }) {
  const { t } = useApp();
  const text =
    tr.risk === 'overlap'
      ? t('risk.overlap', { min: -tr.gapMinutes })
      : tr.risk === 'late'
        ? t('risk.late', { gap: tr.gapMinutes, need: tr.neededMinutes })
        : tr.risk === 'tight'
          ? t('risk.tight', { spare: tr.spareMinutes })
          : t('risk.ok', { gap: tr.gapMinutes });
  return (
    <div className={`transition risk-${tr.risk}`} role={tr.risk === 'ok' ? undefined : 'note'}>
      {tr.risk !== 'ok' && <Icon name="warning" size={16} />}
      <span>{text}</span>
    </div>
  );
}

interface TaskCardProps {
  task: StudyTask;
  now: DateTime;
  onOpen: (task: StudyTask) => void;
  onToggleDone: (task: StudyTask) => void;
}

export function TaskCard({ task, now, onOpen, onToggleDone }: TaskCardProps) {
  const { t, data } = useApp();
  const lang = data.settings.language;
  const deadline = taskDeadline(task);
  const urgency = task.status === 'done' ? 'done' : deadlineUrgency(task, now);
  const done = task.checklist.filter((c) => c.done).length;
  const relative = deadline.setLocale(localeFor(lang)).toRelative({ base: now }) ?? '';
  return (
    <div className={`task-card urgency-${urgency} ${task.status === 'done' ? 'is-done' : ''}`}>
      <label className="task-check" title={t(task.status === 'done' ? 'status.done' : 'deadlines.markDone')}>
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={() => onToggleDone(task)}
          aria-label={`${t('deadlines.markDone')}: ${task.title}`}
        />
      </label>
      <button type="button" className="task-main" onClick={() => onOpen(task)}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {task.module && <span className="badge">{task.module}</span>}
          <span className={`badge priority-${task.priority}`}>{t(`priority.${task.priority}`)}</span>
          <span className="badge">{t(`status.${task.status}`)}</span>
        </span>
        <span className="task-due">
          {t('tasks.due', { date: `${formatDayShort(deadline, lang)} ${formatTime(deadline)}` })}
          {task.status !== 'done' && <> · {relative}</>}
          {task.estimatedHours > 0 && <> · {t('tasks.estimate', { hours: task.estimatedHours })}</>}
          {task.checklist.length > 0 && <> · {t('tasks.checklistProgress', { done, total: task.checklist.length })}</>}
        </span>
      </button>
    </div>
  );
}
