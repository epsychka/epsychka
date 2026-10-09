import { Fragment, useState } from 'react';
import type { DateTime } from 'luxon';
import { conflictKeys, findOverlaps } from '../domain/conflicts';
import { expandAll, type Occurrence } from '../domain/recurrence';
import { addDays, mondayOf, startOfDublinDay, toDateKey } from '../domain/time';
import { analyzeTransition, planTravel } from '../domain/travel';
import type { DateKey, EventKind } from '../domain/types';
import { formatDayShort } from '../i18n';
import { OccurrenceCard, TransitionNote } from '../components/Cards';
import { Icon } from '../components/Icon';
import { useApp } from '../state/context';

interface Props {
  now: DateTime;
  onOpenOccurrence: (occ: Occurrence) => void;
  onAdd: (kind: EventKind, date?: DateKey) => void;
}

export function ScheduleView({ now, onOpenOccurrence, onAdd }: Props) {
  const { data, t } = useApp();
  const lang = data.settings.language;
  const today = toDateKey(now);
  const [weekStart, setWeekStart] = useState<DateKey>(() => mondayOf(today));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = startOfDublinDay(weekStart);
  const to = startOfDublinDay(addDays(weekStart, 7));
  const occurrences = expandAll(data.events, from, to);
  const conflicts = conflictKeys(occurrences);
  const conflictCount = findOverlaps(occurrences).length;
  const isThisWeek = weekStart === mondayOf(today);

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">{t('schedule.title')}</p>
          <h1>
            {formatDayShort(from, lang)} – {formatDayShort(startOfDublinDay(addDays(weekStart, 6)), lang)}
          </h1>
        </div>
        <div className="actions">
          <button type="button" className="button" onClick={() => onAdd('work')}>
            <Icon name="plus" size={18} /> {t('schedule.addShift')}
          </button>
          <button type="button" className="button primary" onClick={() => onAdd('class')}>
            <Icon name="plus" size={18} /> {t('schedule.add')}
          </button>
        </div>
      </header>

      <div className="week-nav">
        <button type="button" className="icon-button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('schedule.prevWeek')}>
          <Icon name="left" />
        </button>
        <button type="button" className="button" onClick={() => setWeekStart(mondayOf(today))} disabled={isThisWeek}>
          {t('schedule.thisWeek')}
        </button>
        <button type="button" className="icon-button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t('schedule.nextWeek')}>
          <Icon name="right" />
        </button>
        {conflictCount > 0 && (
          <span className="status-pill tone-danger">
            <Icon name="warning" size={16} /> {t('schedule.weekConflicts', { count: conflictCount })}
          </span>
        )}
      </div>

      <div className="week-grid">
        {days.map((day) => {
          const dayStart = startOfDublinDay(day);
          const dayOcc = occurrences.filter((o) => toDateKey(o.start) === day);
          return (
            <section key={day} className={`day-column ${day === today ? 'is-today' : ''}`} aria-label={formatDayShort(dayStart, lang)}>
              <header className="day-header">
                <span>{formatDayShort(dayStart, lang)}</span>
                <button type="button" className="icon-button small" onClick={() => onAdd('class', day)} aria-label={`${t('schedule.add')}: ${formatDayShort(dayStart, lang)}`}>
                  <Icon name="plus" size={18} />
                </button>
              </header>
              {dayOcc.length === 0 ? (
                <p className="day-empty">{t('schedule.noEvents')}</p>
              ) : (
                dayOcc.map((occ, i) => {
                  const tr = i > 0 ? analyzeTransition(dayOcc[i - 1], occ) : null;
                  return (
                    <Fragment key={occ.key}>
                      {tr && tr.risk !== 'ok' && <TransitionNote tr={tr} />}
                      <OccurrenceCard
                        occ={occ}
                        onOpen={onOpenOccurrence}
                        conflict={conflicts.has(occ.key)}
                        showLeave
                        leaveAt={planTravel(occ, data.settings.prepMinutes).leaveAt}
                        past={occ.end < now}
                      />
                    </Fragment>
                  );
                })
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
