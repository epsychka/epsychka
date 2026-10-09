import { useRef, useState, type ChangeEvent } from 'react';
import { isTimeKey } from '../domain/time';
import { emptyData, type Language, type Settings, type ThemeMode } from '../domain/types';
import { sanitizeAppData } from '../domain/validation';
import { Field, NumberInput, Segmented } from '../components/Field';
import { useApp } from '../state/context';

export function SettingsView() {
  const { data, dispatch, t } = useApp();
  const { settings } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'danger' } | null>(null);

  const set = (patch: Partial<Settings>) => dispatch({ type: 'updateSettings', patch });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    try {
      const parsed = sanitizeAppData(JSON.parse(await file.text()));
      if (!parsed) throw new Error('invalid');
      const ok = window.confirm(
        t('settings.importConfirm', { events: parsed.data.events.length, tasks: parsed.data.tasks.length }),
      );
      if (!ok) return;
      dispatch({ type: 'replaceAll', data: parsed.data });
      setMessage({ text: t('settings.importDone'), tone: 'ok' });
    } catch {
      setMessage({ text: t('settings.importError'), tone: 'danger' });
    }
  };

  const clearAll = () => {
    if (window.confirm(t('settings.clearConfirm'))) {
      dispatch({ type: 'replaceAll', data: { ...emptyData(), settings: { ...emptyData().settings, language: settings.language } } });
    }
  };

  return (
    <div className="view narrow">
      <header className="view-header">
        <div>
          <p className="eyebrow">{t('nav.settings')}</p>
          <h1>{t('settings.title')}</h1>
        </div>
      </header>

      <section className="card form">
        <h2 className="card-title">{t('settings.appearance')}</h2>
        <Segmented<Language>
          label={t('settings.language')}
          value={settings.language}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ru', label: 'Русский' },
          ]}
          onChange={(language) => set({ language })}
        />
        <Segmented<ThemeMode>
          label={t('settings.theme')}
          value={settings.theme}
          options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
          onChange={(theme) => set({ theme })}
        />
      </section>

      <section className="card form">
        <h2 className="card-title">{t('settings.travel')}</h2>
        <div className="grid-2">
          <Field label={t('settings.prep')}>
            {(id) => <NumberInput id={id} value={settings.prepMinutes} onChange={(prepMinutes) => set({ prepMinutes })} />}
          </Field>
          <Field label={t('settings.buffer')}>
            {(id) => (
              <NumberInput id={id} value={settings.defaultBufferMinutes} onChange={(defaultBufferMinutes) => set({ defaultBufferMinutes })} />
            )}
          </Field>
          <Field label={t('settings.travelUni')}>
            {(id) => (
              <NumberInput
                id={id}
                value={settings.defaultTravelUniMinutes}
                onChange={(defaultTravelUniMinutes) => set({ defaultTravelUniMinutes })}
              />
            )}
          </Field>
          <Field label={t('settings.travelWork')}>
            {(id) => (
              <NumberInput
                id={id}
                value={settings.defaultTravelWorkMinutes}
                onChange={(defaultTravelWorkMinutes) => set({ defaultTravelWorkMinutes })}
              />
            )}
          </Field>
        </div>
      </section>

      <section className="card form">
        <h2 className="card-title">{t('settings.day')}</h2>
        <div className="grid-2">
          <Field label={t('settings.dayStart')}>
            {(id) => (
              <input
                id={id}
                type="time"
                value={settings.dayStart}
                onChange={(e) => isTimeKey(e.target.value) && set({ dayStart: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('settings.dayEnd')}>
            {(id) => (
              <input
                id={id}
                type="time"
                value={settings.dayEnd}
                onChange={(e) => isTimeKey(e.target.value) && set({ dayEnd: e.target.value })}
              />
            )}
          </Field>
        </div>
        <p className="muted small">{t('settings.timezone')}</p>
      </section>

      <section className="card form">
        <h2 className="card-title">{t('settings.data')}</h2>
        <p>{t('settings.storageLocal')}</p>
        <div className="actions wrap">
          <button type="button" className="button" onClick={exportData}>
            {t('settings.export')}
          </button>
          <button type="button" className="button" onClick={() => fileRef.current?.click()}>
            {t('settings.import')}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
          <button type="button" className="button danger" onClick={clearAll}>
            {t('settings.clear')}
          </button>
        </div>
        {message && (
          <p className={`status-pill tone-${message.tone}`} role="status">
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
