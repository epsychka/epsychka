import { useApp } from '../state/context';
import { Icon } from './Icon';
import { ROUTES, type Route } from './routes';

/** Renders as a sidebar on wide screens and a bottom tab bar on phones (via CSS). */
export function Navigation({ current }: { current: Route }) {
  const { t } = useApp();
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-brand">
        <span className="nav-logo" aria-hidden="true">
          SL
        </span>
        <span>{t('appName')}</span>
      </div>
      <ul>
        {ROUTES.map(({ route, icon, label }) => (
          <li key={route}>
            <a href={`#/${route}`} className={current === route ? 'active' : ''} aria-current={current === route ? 'page' : undefined}>
              <Icon name={icon} />
              <span>{t(label)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
