import { useState, type FormEvent } from 'react';
import { conflictsForEvent, type Overlap } from '../domain/conflicts';
import { occurrenceOn } from '../domain/recurrence';
import { compareLocal, isDateKey, isTimeKey, nowInDublin, startOfDublinDay, weekdayOf } from '../domain/time';
import { planTravel } from '../domain/travel';
import { newId, type DateKey, type EventKind, type RecurrenceFreq, type ScheduleEvent, type Settings } from '../domain/types';
import { formatDayShort, formatTime, weekdayNames, type Translate } from '../i18n';
import { useApp } from '../state/context';
import { Field, NumberInput, Segmented } from './Field';
import { Modal } from './Modal';

export interface EventEditorTarget {
  event?: ScheduleEvent;
  /** Date of the occurrence that was clicked (for "skip only this date"). */
  occurrenceDate?: DateKey;
  presetKind?: EventKind;
  presetDate?: DateKey;
}

function travelDefault(kind: EventKind, s: Settings): number {
  if (kind === 'class') return s.defaultTravelUniMinutes;
  if (kind === 'work') return s.defaultTravelWorkMinutes;
  return 0;
}

function blankEvent(target: EventEditorTarget, s: Settings): ScheduleEvent {
  const kind = target.presetKind ?? 'class';
  const date = target.presetDate ?? nowInDublin().toISODate()!;
  const now = new Date().toISOString();
  return {
    id: newId(),
    kind,
    title: '',
    location: '',
    startDate: date,
    startTime: kind === 'work' ? '17:00' : '09:00',
    endDate: date,
    endTime: kind === 'work' ? '22:00' : '10:00',
    travelMinutes: travelDefault(kind, s),
    bufferMinutes: s.defaultBufferMinutes,
    recurrence: { freq: 'none', interval: 1, weekdays: [], until: '', exceptions: [] },
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

function validateEvent(ev: ScheduleEvent, t: Translate): string | null {
  if (!ev.title.trim()) return t('event.error.title');
  if (![ev.startDate, ev.endDate].every(isDateKey) || ![ev.startTime, ev.endTime].every(isTimeKey)) {
    return t('event.error.dates');
  }
  if (compareLocal(ev.startDate, ev.startTime, ev.endDate, ev.endTime) >= 0) return t('event.error.order');
  if (ev.recurrence.freq !== 'none' && ev.recurrence.until && ev.recurrence.until < ev.startDate) {
    return t('event.error.until');
  }
  return null;
}

const CONFLICT_HORIZON_DAYS = 180;
const MAX_CONFLICTS_SHOWN = 5;

export function EventForm({ target, onClose }: { target: EventEditorTarget; onClose: () => void }) {
  const { data, dispatch, t } = useApp();
  const { settings } = data;
  const lang = settings.language;
  const isNew = !target.event;
  const [ev, setEv] = useState<ScheduleEvent>(() => target.event ?? blankEvent(target, settings));
  const [travelTouched, setTravelTouched] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<Overlap[] | null>(null);

  const update = (patch: Partial<ScheduleEvent>) => {
    setEv((prev) => ({ ...prev, ...patch }));
    setPendingConflicts(null);
    setError(null);
  };
  const updateRecurrence = (patch: Partial<ScheduleEvent['recurrence']>) =>
    update({ recurrence: { ...ev.recurrence, ...patch } });

  const cleaned = (): ScheduleEvent => {
    const r = ev.recurrence;
    const weekdays = r.freq === 'weekly' && r.weekdays.length === 0 ? [weekdayOf(ev.startDate)] : r.weekdays;
    return {
      ...ev,
      title: ev.title.trim(),
      location: ev.location.trim(),
      recurrence: { ...r, weekdays: r.freq === 'weekly' ? weekdays : [], until: r.freq === 'none' ? '' : r.until },
    };
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateEvent(ev, t);
    if (problem) {
      setError(problem);
      return;
    }
    const final = cleaned();
    if (pendingConflicts === null) {
      const today = nowInDublin().toISODate()!;
      const from = startOfDublinDay(final.startDate > today ? final.startDate : today);
      const conflicts = conflictsForEvent(final, data.events, from, from.plus({ days: CONFLICT_HORIZON_DAYS }));
      if (conflicts.length > 0) {
        setPendingConflicts(conflicts);
        return; // show warning; the next submit saves anyway
      }
    }
    dispatch({ type: 'upsertEvent', event: final });
    onClose();
  };

  const remove = () => {
    if (!target.event) return;
    if (window.confirm(t('common.confirmDelete', { name: target.event.title }))) {
      dispatch({ type: 'deleteEvent', id: target.event.id });
      onClose();
    }
  };

  const skipOne = () => {
    if (!target.event || !target.occurrenceDate) return;
    dispatch({ type: 'skipOccurrence', id: target.event.id, date: target.occurrenceDate });
    onClose();
  };

  const preview = (() => {
    if (validateEvent(ev, t) !== null) return null;
    const plan = planTravel(occurrenceOn(ev, ev.startDate), settings.prepMinutes);
    return t('event.travelPreview', { leave: formatTime(plan.leaveAt), prep: formatTime(plan.prepareAt) });
  })();

  const days = weekdayNames(lang);
  const isRecurring = target.event && target.event.recurrence.freq !== 'none';

  return (
    <Modal
      title={t(isNew ? 'event.new' : 'event.edit')}
      onClose={onClose}
      closeLabel={t('common.close')}
      footer={
        <>
          {!isNew && (
            <button type="button" className="button danger" onClick={remove}>
              {t(isRecurring ? 'event.deleteSeries' : 'common.delete')}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="event-form" className={`button ${pendingConflicts ? 'warning' : 'primary'}`}>
            {t(pendingConflicts ? 'common.saveAnyway' : 'common.save')}
          </button>
        </>
      }
    >
      <form id="event-form" className="form" onSubmit={submit} noValidate>
        <Segmented<EventKind>
          label={t('event.kind')}
          value={ev.kind}
          options={(['class', 'work', 'other'] as const).map((k) => ({ value: k, label: t(`kind.${k}`) }))}
          onChange={(kind) =>
            update(travelTouched ? { kind } : { kind, travelMinutes: travelDefault(kind, settings) })
          }
        />
        <Field label={t('event.title')}>
          {(id) => (
            <input
              id={id}
              value={ev.title}
              placeholder={t('event.titlePlaceholder')}
              onChange={(e) => update({ title: e.target.value })}
              required
              maxLength={200}
            />
          )}
        </Field>
        <Field label={t('event.location')}>
          {(id) => (
            <input
              id={id}
              value={ev.location}
              placeholder={t('event.locationPlaceholder')}
              onChange={(e) => update({ location: e.target.value })}
              maxLength={200}
            />
          )}
        </Field>
        <div className="grid-2">
          <Field label={t('event.startDate')}>
            {(id) => (
              <input
                id={id}
                type="date"
                value={ev.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;
                  // Keep the same length in days when moving the start date.
                  const keepEnd = ev.endDate < startDate || ev.endDate === ev.startDate;
                  update(keepEnd ? { startDate, endDate: startDate } : { startDate });
                }}
              />
            )}
          </Field>
          <Field label={t('event.startTime')}>
            {(id) => <input id={id} type="time" value={ev.startTime} onChange={(e) => update({ startTime: e.target.value })} />}
          </Field>
          <Field label={t('event.endDate')}>
            {(id) => (
              <input id={id} type="date" value={ev.endDate} min={ev.startDate} onChange={(e) => update({ endDate: e.target.value })} />
            )}
          </Field>
          <Field label={t('event.endTime')}>
            {(id) => <input id={id} type="time" value={ev.endTime} onChange={(e) => update({ endTime: e.target.value })} />}
          </Field>
        </div>
        <div className="grid-2">
          <Field label={t('event.travel')}>
            {(id) => (
              <NumberInput
                id={id}
                value={ev.travelMinutes}
                onChange={(travelMinutes) => {
                  setTravelTouched(true);
                  update({ travelMinutes });
                }}
              />
            )}
          </Field>
          <Field label={t('event.buffer')}>
            {(id) => <NumberInput id={id} value={ev.bufferMinutes} onChange={(bufferMinutes) => update({ bufferMinutes })} />}
          </Field>
        </div>
        {preview && <p className="hint-box">{preview}</p>}

        <Field label={t('event.repeat')}>
          {(id) => (
            <select
              id={id}
              value={ev.recurrence.freq}
              onChange={(e) => updateRecurrence({ freq: e.target.value as RecurrenceFreq })}
            >
              <option value="none">{t('event.repeat.none')}</option>
              <option value="daily">{t('event.repeat.daily')}</option>
              <option value="weekly">{t('event.repeat.weekly')}</option>
            </select>
          )}
        </Field>
        {ev.recurrence.freq !== 'none' && (
          <>
            {ev.recurrence.freq === 'weekly' && (
              <fieldset className="field">
                <legend className="field-label">{t('event.weekdays')}</legend>
                <div className="weekday-picker">
                  {days.map((name, i) => {
                    const day = i + 1;
                    const selected =
                      ev.recurrence.weekdays.length === 0 ? day === weekdayOf(ev.startDate) : ev.recurrence.weekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={selected}
                        className={selected ? 'active' : ''}
                        onClick={() => {
                          const current =
                            ev.recurrence.weekdays.length === 0 ? [weekdayOf(ev.startDate)] : ev.recurrence.weekdays;
                          const next = selected ? current.filter((d) => d !== day) : [...current, day].sort();
                          if (next.length === 0) {
                            setError(t('event.error.weekdays'));
                            return;
                          }
                          updateRecurrence({ weekdays: next });
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <div className="grid-2">
              <Field label={t(ev.recurrence.freq === 'daily' ? 'event.interval.daily' : 'event.interval.weekly')}>
                {(id) => (
                  <NumberInput
                    id={id}
                    min={1}
                    max={52}
                    value={ev.recurrence.interval}
                    onChange={(interval) => updateRecurrence({ interval: Math.max(1, Math.round(interval)) })}
                  />
                )}
              </Field>
              <Field label={t('event.until')}>
                {(id) => (
                  <input
                    id={id}
                    type="date"
                    min={ev.startDate}
                    value={ev.recurrence.until}
                    onChange={(e) => updateRecurrence({ until: e.target.value })}
                  />
                )}
              </Field>
            </div>
          </>
        )}
        <Field label={t('event.notes')}>
          {(id) => <textarea id={id} rows={3} value={ev.notes} onChange={(e) => update({ notes: e.target.value })} />}
        </Field>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {pendingConflicts && (
          <div className="conflict-box" role="alert">
            <strong>{t('event.conflictsFound', { count: pendingConflicts.length })}</strong>
            <ul>
              {pendingConflicts.slice(0, MAX_CONFLICTS_SHOWN).map((c) => (
                <li key={`${c.a.key}-${c.b.key}`}>
                  {formatDayShort(c.b.start, lang)} {formatTime(c.b.start)}–{formatTime(c.b.end)} · {c.b.event.title}
                </li>
              ))}
            </ul>
            {pendingConflicts.length > MAX_CONFLICTS_SHOWN && (
              <p>{t('event.conflictMore', { count: pendingConflicts.length - MAX_CONFLICTS_SHOWN })}</p>
            )}
          </div>
        )}
        {isRecurring && target.occurrenceDate && (
          <button type="button" className="button full" onClick={skipOne}>
            {t('event.skipOccurrence', { date: formatDayShort(startOfDublinDay(target.occurrenceDate), lang) })}
          </button>
        )}
      </form>
    </Modal>
  );
}
