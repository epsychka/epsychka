import type { MessageKey } from '../i18n';
import type { IconName } from './Icon';

export type Route = 'today' | 'schedule' | 'tasks' | 'deadlines' | 'settings';

export const ROUTES: { route: Route; icon: IconName; label: MessageKey }[] = [
  { route: 'today', icon: 'today', label: 'nav.today' },
  { route: 'schedule', icon: 'schedule', label: 'nav.schedule' },
  { route: 'tasks', icon: 'tasks', label: 'nav.tasks' },
  { route: 'deadlines', icon: 'deadlines', label: 'nav.deadlines' },
  { route: 'settings', icon: 'settings', label: 'nav.settings' },
];
