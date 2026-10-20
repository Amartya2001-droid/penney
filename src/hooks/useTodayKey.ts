import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { DateKey } from '../types';
import { toDateKey } from '../utils/dates';

/**
 * Today's date key, kept current across midnight and when the app returns from the background,
 * so the dashboard never shows yesterday's pace and mood.
 */
export function useTodayKey(): DateKey {
  const [todayKey, setTodayKey] = useState<DateKey>(() => toDateKey(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => setTodayKey(toDateKey(new Date()));

    const scheduleMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, nextMidnight.getTime() - now.getTime());
    };

    scheduleMidnight();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });

    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return todayKey;
}
