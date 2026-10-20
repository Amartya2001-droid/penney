import type { DateKey } from '../types';
import { dateFromKey } from './dates';

export function formatLongDate(key: DateKey): string {
  try {
    return dateFromKey(key).toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return key;
  }
}

export function formatShortDate(key: DateKey): string {
  try {
    return dateFromKey(key).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  } catch {
    return key;
  }
}
