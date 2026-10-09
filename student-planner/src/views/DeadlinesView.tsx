import type { DateTime } from 'luxon';
import { deadlineUrgency, upcomingDeadlines, type DeadlineUrgency } from '../domain/day';
import type { StudyTask } from '../domain/types';
import { TaskCard } from '../components/Cards';
import { useApp } from '../state/context';

interface Props {
  now: DateTime;
  onOpenTask: (task?: StudyTask) => void;
  onToggleTask: (task: StudyTask) => void;
}

const GROUPS: DeadlineUrgency[] = ['overdue', 'today', 'soon', 'later'];

export function DeadlinesView({ now, onOpenTask, onToggleTask }: Props) {
  const { data, t } = useApp();
  const open = upcomingDeadlines(data.tasks);

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">{t('nav.deadlines')}</p>
          <h1>{t('deadlines.title')}</h1>
        </div>
      </header>
      {open.length === 0 && <p className="empty">{t('deadlines.empty')}</p>}
      {GROUPS.map((group) => {
        const items = open.filter((task) => deadlineUrgency(task, now) === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="section">
            <h2 className={`group-title urgency-${group}`}>
              {t(`deadlines.${group}`)} <span className="count">{items.length}</span>
            </h2>
            <div className="task-list">
              {items.map((task) => (
                <TaskCard key={task.id} task={task} now={now} onOpen={onOpenTask} onToggleDone={onToggleTask} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
