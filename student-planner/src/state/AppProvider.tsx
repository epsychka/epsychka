import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { emptyData, type AppData } from '../domain/types';
import { makeTranslate } from '../i18n';
import { StorageError, type LoadWarning, type Repository } from '../storage/repository';
import { AppContext, type AppContextValue, type SaveError } from './context';
import { reducer, type Action } from './reducer';

interface Props {
  repository: Repository;
  children: ReactNode;
}

/**
 * Loads data once, then saves after every change.
 * Children are rendered only after loading, so nothing can overwrite
 * stored data with an empty state by accident.
 */
export function AppProvider({ repository, children }: Props) {
  const [data, rawDispatch] = useReducer(reducer, undefined, emptyData);
  const [loaded, setLoaded] = useState(false);
  const [warnings, setWarnings] = useState<LoadWarning[]>([]);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  // Counts local changes; only those (not the initial load) trigger a save.
  const [revision, setRevision] = useState(0);
  const lastSaved = useRef<AppData | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository.load().then((result) => {
      if (cancelled) return;
      lastSaved.current = result.data;
      rawDispatch({ type: 'replaceAll', data: result.data });
      setWarnings(result.warnings);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Another tab changed the data → show the newest version here too.
  useEffect(() => {
    if (!repository.subscribe) return;
    return repository.subscribe((external) => {
      lastSaved.current = external;
      rawDispatch({ type: 'replaceAll', data: external });
    });
  }, [repository]);

  useEffect(() => {
    if (!loaded || revision === 0 || lastSaved.current === data) return;
    repository
      .save(data)
      .then(() => {
        lastSaved.current = data;
        setSaveError(null);
      })
      .catch((e: unknown) => {
        const reason = e instanceof StorageError ? e.reason : 'unknown';
        setSaveError({ reason, message: e instanceof Error ? e.message : String(e) });
      });
  }, [data, loaded, revision, repository]);

  const dispatch = useCallback((action: Action) => {
    rawDispatch(action);
    setRevision((r) => r + 1);
  }, []);

  const dismissWarning = useCallback((index: number) => {
    setWarnings((w) => w.filter((_, i) => i !== index));
  }, []);

  const t = useMemo(() => makeTranslate(data.settings.language), [data.settings.language]);

  const value = useMemo<AppContextValue>(
    () => ({ data, dispatch, t, warnings, dismissWarning, saveError }),
    [data, dispatch, t, warnings, dismissWarning, saveError],
  );

  if (!loaded) return <div className="loading" aria-busy="true" />;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
