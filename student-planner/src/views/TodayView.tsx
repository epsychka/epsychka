import { Fragment } from 'react';
import { freeTime, nextCommitment, nextTask, occurrencesForDay } from '../domain/day';
import { conflictKeys } from '../domain/conflicts';
import type { Occurrence } from '../domain/recurrence';
import { minutesBetween, toDateKey } from '../domain/time';
import { analyzeDay, planTravel } from '../domain/travel';
import type { StudyTask } from '../domain/types';
import { formatDayLong, formatDayShort, formatDuration, formatTime } from '../i18n';
import { OccurrenceCard, TaskCard, TransitionNote } from '../components/Cards';
import { Icon } from '../components/Icon';
import { useApp } from '../state/context';
import type { DateTime } from 'luxon';

interface Props {
  now: DateTime;
  onOpenOccurrence: (occ: Occurrence) => void;
  onAddEvent: () => void;
  onOpenTask: (task?: StudyTask) => void;
  onToggleTask: (task: StudyTask) => void;
}

export function TodayView({ now, onOpenOccurrence, onAddEvent, onOpenTask, onToggleTask }: Props) {
  const { data, t } = useApp();
  const { settings } = data;
  const lang = settings.language;
  const today = toDateKey(now);

  const todays = occurrencesForDay(data.events, today);
  const transitions = analyzeDay(todays);
  const conflicts = conflictKeys(todays);
  const free = freeTime(todays, today, settings, now);
  const next = nextCommitment(data.events, now);
  const task = nextTask(data.tasks, now);

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">{t('today.title')}</p>
          <h1>{formatDayLong(now, lang)}</h1>
        </div>
        <p className="clock" aria-label="Dublin time">
          {formatTime(now)}
        </p>
      </header>

      <div className="cards-grid">
        <NextCommitmentCard now={now} next={next} onOpen={onOpenOccurrence} />

        <section className="card">
          <h2 className="card-title">{t('today.nextTask')}</h2>
          {task ? (
            <TaskCard task={task} now={now} onOpen={onOpenTask} onToggleDone={onToggleTask} />
          ) : (
            <p className="muted">{t('today.noTasks')}</p>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">{t('today.free')}</h2>
          <p className="big-number">{formatDuration(free.totalMinutes, t)}</p>
          <p>{t('today.freeLeft', { time: formatDuration(free.remainingMinutes, t) })}</p>
          <p className="muted small">{t('today.freeHint', { start: settings.dayStart, end: settings.dayEnd })}</p>
        </section>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>{t('today.timeline')}</h2>
          <div className="actions">
            <button type="button" className="button" onClick={() => onOpenTask()}>
              <Icon name="plus" size={18} /> {t('today.addTask')}
            </button>
            <button type="button" className="button primary" onClick={onAddEvent}>
              <Icon name="plus" size={18} /> {t('today.addEvent')}
            </button>
          </div>
        </div>
        {todays.length === 0 ? (
          <p className="empty">{t('today.empty')}</p>
        ) : (
          <div className="timeline">
            {todays.map((occ, i) => (
              <Fragment key={occ.key}>
                {i > 0 && <TransitionNote tr={transitions[i - 1]} />}
                <OccurrenceCard
                  occ={occ}
                  onOpen={onOpenOccurrence}
                  conflict={conflicts.has(occ.key)}
                  showLeave
                  leaveAt={planTravel(occ, settings.prepMinutes).leaveAt}
                  past={occ.end < now}
                />
              </Fragment>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NextCommitmentCard({
  now,
  next,
  onOpen,
}: {
  now: DateTime;
  next: Occurrence | undefined;
  onOpen: (occ: Occurrence) => void;
}) {
  const { data, t } = useApp();
  const lang = data.settings.language;
  if (!next) {
    return (
      <section className="card highlight">
        <h2 className="card-title">{t('today.next')}</h2>
        <p className="muted">{t('today.nothingNext')}</p>
      </section>
    );
  }
  const plan = planTravel(next, data.settings.prepMinutes);
  const ongoing = next.start <= now;
  const untilLeave = minutesBetween(now, plan.leaveAt);
  const isToday = toDateKey(next.start) === toDateKey(now);

  let status: { text: string; tone: 'ok' | 'warn' | 'danger' } | null = null;
  if (!ongoing) {
    if (untilLeave > 0) status = { text: t('today.leaveIn', { time: formatDuration(untilLeave, t) }), tone: untilLeave <= 15 ? 'warn' : 'ok' };
    else if (now < next.start && untilLeave > -5) status = { text: t('today.leaveNow'), tone: 'warn' };
    else status = { text: t('today.late', { time: formatDuration(-untilLeave, t) }), tone: 'danger' };
  }

  return (
    <section className="card highlight">
      <h2 className="card-title">{ongoing ? t('today.now') : t('today.next')}</h2>
      <button type="button" className="next-main" onClick={() => onOpen(next)}>
        <span className={`badge kind-${next.event.kind}`}>{t(`kind.${next.event.kind}`)}</span>
        <span className="next-title">{next.event.title}</span>
        <span className="next-time">
          {!isToday && `${formatDayShort(next.start, lang)}, `}
          {formatTime(next.start)}–{formatTime(next.end)}
        </span>
        {next.event.location && (
          <span className="muted">
            <Icon name="pin" size={14} /> {next.event.location}
          </span>
        )}
      </button>
      {!ongoing && (
        <dl className="leave-grid">
          <div>
            <dt>{t('today.prepareAt')}</dt>
            <dd>{formatTime(plan.prepareAt)}</dd>
          </div>
          <div>
            <dt>{t('today.leaveAt')}</dt>
            <dd>{formatTime(plan.leaveAt)}</dd>
          </div>
        </dl>
      )}
      {status && <p className={`status-pill tone-${status.tone}`}>{status.text}</p>}
    </section>
  );
}
