import type { LoadWarning } from '../storage/repository';
import type { Translate } from '../i18n';
import { useApp } from '../state/context';
import { Icon } from './Icon';

function warningText(w: LoadWarning, t: Translate): string {
  switch (w.type) {
    case 'restored-from-backup':
      return t('storage.warn.restored');
    case 'corrupted-reset':
      return t('storage.warn.reset', { key: w.savedAs });
    case 'dropped-records':
      return t('storage.warn.dropped', { count: w.count });
    case 'storage-unavailable':
      return t('storage.warn.unavailable');
  }
}

/** Shows storage problems so data loss is never silent. */
export function StorageBanners() {
  const { t, warnings, dismissWarning, saveError } = useApp();
  return (
    <div className="banners" aria-live="polite">
      {saveError && (
        <div className="banner banner-error" role="alert">
          <Icon name="warning" />
          <span>
            {saveError.reason === 'unknown'
              ? t('storage.error.unknown', { message: saveError.message })
              : t(saveError.reason === 'quota' ? 'storage.error.quota' : 'storage.error.unavailable')}
          </span>
        </div>
      )}
      {warnings.map((w, i) => (
        <div className="banner banner-warning" key={`${w.type}-${i}`}>
          <Icon name="warning" />
          <span>{warningText(w, t)}</span>
          <button type="button" className="link-button" onClick={() => dismissWarning(i)}>
            {t('common.dismiss')}
          </button>
        </div>
      ))}
    </div>
  );
}
