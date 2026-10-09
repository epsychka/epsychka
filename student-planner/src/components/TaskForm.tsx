import { useState, type FormEvent } from 'react';
import { addDays, isDateKey, isTimeKey, nowInDublin } from '../domain/time';
import { newId, type StudyTask, type TaskPriority, type TaskStatus } from '../domain/types';
import { useApp } from '../state/context';
import { Field, NumberInput, Segmented } from './Field';
import { Icon } from './Icon';
import { Modal } from './Modal';

export interface TaskEditorTarget {
  task?: StudyTask;
}

function blankTask(): StudyTask {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: '',
    module: '',
    deadlineDate: addDays(nowInDublin().toISODate()!, 7),
    deadlineTime: '23:59',
    priority: 'medium',
    estimatedHours: 2,
    status: 'todo',
    notes: '',
    checklist: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function TaskForm({ target, onClose }: { target: TaskEditorTarget; onClose: () => void }) {
  const { dispatch, t } = useApp();
  const isNew = !target.task;
  const [task, setTask] = useState<StudyTask>(() => target.task ?? blankTask());
  const [newStep, setNewStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<StudyTask>) => {
    setTask((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  const addStep = () => {
    const text = newStep.trim();
    if (!text) return;
    update({ checklist: [...task.checklist, { id: newId(), text, done: false }] });
    setNewStep('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!task.title.trim()) return setError(t('task.error.title'));
    if (!isDateKey(task.deadlineDate) || !isTimeKey(task.deadlineTime)) return setError(t('task.error.deadline'));
    // A step typed but not yet added with the button is kept too.
    const pending = newStep.trim();
    const checklist = pending ? [...task.checklist, { id: newId(), text: pending, done: false }] : task.checklist;
    dispatch({
      type: 'upsertTask',
      task: { ...task, title: task.title.trim(), module: task.module.trim(), checklist: checklist.filter((c) => c.text.trim()) },
    });
    onClose();
  };

  const remove = () => {
    if (!target.task) return;
    if (window.confirm(t('common.confirmDelete', { name: target.task.title }))) {
      dispatch({ type: 'deleteTask', id: target.task.id });
      onClose();
    }
  };

  return (
    <Modal
      title={t(isNew ? 'task.new' : 'task.edit')}
      onClose={onClose}
      closeLabel={t('common.close')}
      footer={
        <>
          {!isNew && (
            <button type="button" className="button danger" onClick={remove}>
              {t('common.delete')}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="task-form" className="button primary">
            {t('common.save')}
          </button>
        </>
      }
    >
      <form id="task-form" className="form" onSubmit={submit} noValidate>
        <Field label={t('task.title')}>
          {(id) => (
            <input
              id={id}
              value={task.title}
              placeholder={t('task.titlePlaceholder')}
              onChange={(e) => update({ title: e.target.value })}
              maxLength={200}
              required
            />
          )}
        </Field>
        <Field label={t('task.module')}>
          {(id) => (
            <input
              id={id}
              value={task.module}
              placeholder={t('task.modulePlaceholder')}
              onChange={(e) => update({ module: e.target.value })}
              maxLength={120}
            />
          )}
        </Field>
        <div className="grid-2">
          <Field label={t('task.deadlineDate')}>
            {(id) => <input id={id} type="date" value={task.deadlineDate} onChange={(e) => update({ deadlineDate: e.target.value })} />}
          </Field>
          <Field label={t('task.deadlineTime')}>
            {(id) => <input id={id} type="time" value={task.deadlineTime} onChange={(e) => update({ deadlineTime: e.target.value })} />}
          </Field>
        </div>
        <Segmented<TaskPriority>
          label={t('task.priority')}
          value={task.priority}
          options={(['low', 'medium', 'high'] as const).map((p) => ({ value: p, label: t(`priority.${p}`) }))}
          onChange={(priority) => update({ priority })}
        />
        <Segmented<TaskStatus>
          label={t('task.status')}
          value={task.status}
          options={(['todo', 'in_progress', 'done'] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))}
          onChange={(status) => update({ status })}
        />
        <Field label={t('task.estimate')}>
          {(id) => (
            <NumberInput id={id} min={0} max={1000} step={0.5} value={task.estimatedHours} onChange={(estimatedHours) => update({ estimatedHours })} />
          )}
        </Field>

        <fieldset className="field">
          <legend className="field-label">{t('task.checklist')}</legend>
          <ul className="checklist">
            {task.checklist.map((item) => (
              <li key={item.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) =>
                      update({ checklist: task.checklist.map((c) => (c.id === item.id ? { ...c, done: e.target.checked } : c)) })
                    }
                  />
                  <input
                    className="inline-input"
                    value={item.text}
                    aria-label={t('task.checklist')}
                    onChange={(e) =>
                      update({ checklist: task.checklist.map((c) => (c.id === item.id ? { ...c, text: e.target.value } : c)) })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('task.removeStep')}
                  onClick={() => update({ checklist: task.checklist.filter((c) => c.id !== item.id) })}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <div className="add-row">
            <input
              value={newStep}
              placeholder={t('task.checklistPlaceholder')}
              aria-label={t('task.checklistPlaceholder')}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStep();
                }
              }}
            />
            <button type="button" className="button" onClick={addStep} disabled={!newStep.trim()}>
              {t('task.checklistAdd')}
            </button>
          </div>
        </fieldset>

        <Field label={t('task.notes')}>
          {(id) => <textarea id={id} rows={4} value={task.notes} onChange={(e) => update({ notes: e.target.value })} />}
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
