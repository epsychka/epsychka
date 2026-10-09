import { useEffect } from 'react';
import type { Language, ThemeMode } from '../domain/types';

/** Applies the chosen theme and language to the <html> element. */
export function useDocumentSettings(theme: ThemeMode, language: Language): void {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
