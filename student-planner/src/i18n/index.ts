import type { DateTime } from 'luxon';
import type { Language } from '../domain/types';
import { en, type MessageKey } from './en';
import { ru } from './ru';

export type { MessageKey };

const dictionaries: Record<Language, Record<MessageKey, string>> = { en, ru };

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export function makeTranslate(lang: Language): Translate {
  const dict = dictionaries[lang] ?? en;
  return (key, params) => {
    let text = dict[key] ?? en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
    }
    return text;
  };
}

/** Locale used for dates: Irish English or Russian. */
export function localeFor(lang: Language): string {
  return lang === 'ru' ? 'ru' : 'en-IE';
}

export function formatTime(dt: DateTime): string {
  return dt.toFormat('HH:mm');
}

export function formatDayLong(dt: DateTime, lang: Language): string {
  return dt.setLocale(localeFor(lang)).toFormat('cccc, d MMMM');
}

export function formatDayShort(dt: DateTime, lang: Language): string {
  return dt.setLocale(localeFor(lang)).toFormat('ccc d MMM');
}

/** "1 h 25 min" / "1 ч 25 мин". */
export function formatDuration(totalMinutes: number, t: Translate): string {
  const m = Math.max(0, Math.round(Math.abs(totalMinutes)));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} ${t('common.minutes')}`;
  if (rest === 0) return `${h} ${t('common.hoursShort')}`;
  return `${h} ${t('common.hoursShort')} ${rest} ${t('common.minutes')}`;
}

/** Short weekday names Mon…Sun for the given language (ISO 1..7). */
export function weekdayNames(lang: Language): string[] {
  return lang === 'ru'
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}
