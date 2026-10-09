import { createContext, useContext } from 'react';
import type { AppData } from '../domain/types';
import type { Translate } from '../i18n';
import type { LoadWarning } from '../storage/repository';
import type { Action } from './reducer';

export interface SaveError {
  reason: 'quota' | 'unavailable' | 'unknown';
  message: string;
}

export interface AppContextValue {
  data: AppData;
  dispatch: (action: Action) => void;
  t: Translate;
  warnings: LoadWarning[];
  dismissWarning: (index: number) => void;
  saveError: SaveError | null;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
