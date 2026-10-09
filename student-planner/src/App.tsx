import { useCallback, useEffect, useState } from 'react';
import type { Occurrence } from './domain/recurrence';
import type { DateKey, EventKind, StudyTask } from './domain/types';
import { StorageBanners } from './components/Banners';
import { EventForm, type EventEditorTarget } from './components/EventForm';
import { Navigation } from './components/Navigation';
import { ROUTES, type Route } from './components/routes';
import { TaskForm, type TaskEditorTarget } from './components/TaskForm';
import { useNow } from './hooks/useNow';
import { useDocumentSettings } from './hooks/useTheme';
import { useApp } from './state/context';
import { DeadlinesView } from './views/DeadlinesView';
import { ScheduleView } from './views/ScheduleView';
import { SettingsView } from './views/SettingsView';
import { TasksView } from './views/TasksView';
import { TodayView } from './views/TodayView';

function routeFromHash(): Route {
  const name = window.location.hash.replace(/^#\/?/, '');
  return ROUTES.some((r) => r.route === name) ? (name as Route) : 'today';
}

/** Hash-based routing (#/schedule) keeps the current tab after a page reload. */
function useRoute(): Route {
  const [route, setRoute] = useState<Route>(routeFromHash);
  useEffect(() => {
    const onChange = () => {
      setRoute(routeFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const { data, dispatch } = useApp();
  const route = useRoute();
  const now = useNow();
  const [eventEditor, setEventEditor] = useState<EventEditorTarget | null>(null);
  const [taskEditor, setTaskEditor] = useState<TaskEditorTarget | null>(null);
  useDocumentSettings(data.settings.theme, data.settings.language);

  const openOccurrence = useCallback(
    (occ: Occurrence) => setEventEditor({ event: occ.event, occurrenceDate: occ.date }),
    [],
  );
  const addEvent = useCallback(
    (presetKind: EventKind = 'class', presetDate?: DateKey) => setEventEditor({ presetKind, presetDate }),
    [],
  );
  const openTask = useCallback((task?: StudyTask) => setTaskEditor({ task }), []);
  const toggleTask = useCallback(
    (task: StudyTask) =>
      dispatch({ type: 'upsertTask', task: { ...task, status: task.status === 'done' ? 'todo' : 'done' } }),
    [dispatch],
  );

  const taskProps = { now, onOpenTask: openTask, onToggleTask: toggleTask };

  return (
    <div className="app-shell">
      <Navigation current={route} />
      <main className="main">
        <StorageBanners />
        {route === 'today' && <TodayView {...taskProps} onOpenOccurrence={openOccurrence} onAddEvent={() => addEvent()} />}
        {route === 'schedule' && <ScheduleView now={now} onOpenOccurrence={openOccurrence} onAdd={addEvent} />}
        {route === 'tasks' && <TasksView {...taskProps} />}
        {route === 'deadlines' && <DeadlinesView {...taskProps} />}
        {route === 'settings' && <SettingsView />}
      </main>
      {eventEditor && <EventForm target={eventEditor} onClose={() => setEventEditor(null)} />}
      {taskEditor && <TaskForm target={taskEditor} onClose={() => setTaskEditor(null)} />}
    </div>
  );
}
