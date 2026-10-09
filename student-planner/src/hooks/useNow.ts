import { useEffect, useState } from 'react';
import type { DateTime } from 'luxon';
import { nowInDublin } from '../domain/time';

/** Current Dublin time, refreshed every `intervalMs` and when the tab becomes visible. */
export function useNow(intervalMs = 30_000): DateTime {
  const [now, setNow] = useState(nowInDublin);
  useEffect(() => {
    const tick = () => setNow(nowInDublin());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
