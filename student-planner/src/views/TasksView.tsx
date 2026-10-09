import { useState } from 'react';
import type { DateTime } from 'luxon';
import { taskDeadline } from '../domain/day';
import type { StudyTask } from '../domain/types';
import { Segmented } from '../components/Field';
import { TaskCard } from '../components/Cards';
import { Icon } from '../components/Icon';
import { useApp } from '../state/context';

type Filter = 'open' | 'all' | 'done';

interface Props {
  now: DateTime;
  onOpenTask: (task?: StudyTask) => void;
  onToggleTask: (task: StudyTask) => void;
}

export function TasksView({ now, onOpenTask, onToggleTask }: Props) {
  const { data, t } = useApp();
  const [filter, setFilter] = useState<Filter>('open');

  const tasks = data.tasks
    .filter((task) => (filter === 'all' ? true : filter === 'done' ? task.status === 'done' : task.status !== 'done'))
    .sort((a, b) => taskDeadline(a).toMillis() - taskDeadline(b).toMillis());

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">{t('nav.tasks')}</p>
          <h1>{t('tasks.title')}</h1>
        </div>
        <button type="button" className="button primary" onClick={() => onOpenTask()}>
          <Icon name="plus" size={18} /> {t('tasks.add')}
        </button>
      </header>
      <Segmented<Filter>
        label=""
        value={filter}
        options={(['open', 'all', 'done'] as const).map((f) => ({ value: f, label: t(`tasks.filter.${f}`) }))}
        onChange={setFilter}
      />
      {tasks.length === 0 ? (
        <p className="empty">{t('tasks.empty')}</p>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} now={now} onOpen={onOpenTask} onToggleDone={onToggleTask} />
          ))}
        </div>
      )}
    </div>
  );
}
