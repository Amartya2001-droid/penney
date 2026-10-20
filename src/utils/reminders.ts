import type { DateKey, Transaction } from '../types';
import { addDays, dateFromKey, toDateKey } from './dates';

export interface ReminderSettings {
  enabled: boolean;
  /** Local time of day, 24-hour. */
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

/**
 * Reminders are scheduled as individual one-off notifications this many days ahead, so a day
 * that already has an expense can be skipped. Opening the app or logging anything reschedules
 * them, so the window keeps rolling forward.
 */
export const REMINDER_DAYS_AHEAD = 14;

/** The time picker moves in steps of this many minutes. */
export const REMINDER_STEP_MINUTES = 30;

export function isReminderSettings(value: unknown): value is ReminderSettings {
  if (typeof value !== 'object' || value === null) return false;
  const { enabled, hour, minute } = value as Record<string, unknown>;
  return (
    typeof enabled === 'boolean' &&
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    (hour as number) >= 0 &&
    (hour as number) <= 23 &&
    (minute as number) >= 0 &&
    (minute as number) <= 59
  );
}

/** Moves a time by whole steps, wrapping around midnight. */
export function shiftReminderTime(
  settings: ReminderSettings,
  steps: number,
  stepMinutes: number = REMINDER_STEP_MINUTES,
): ReminderSettings {
  const day = 24 * 60;
  const total = (((settings.hour * 60 + settings.minute + steps * stepMinutes) % day) + day) % day;
  return { ...settings, hour: Math.floor(total / 60), minute: total % 60 };
}

/** "8:00 PM" */
export function formatReminderTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** True if anything was logged for `dayKey`, or logged on that day (even if dated earlier). */
export function hasLoggedOn(transactions: Transaction[], dayKey: DateKey): boolean {
  return transactions.some(
    (t) => t.date === dayKey || toDateKey(new Date(t.created_at)) === dayKey,
  );
}

/**
 * When to remind: at the chosen time on each of the next `days` days, skipping today if it's
 * already been logged or the time has passed. Returns local Date objects, earliest first.
 */
export function planReminderDates(
  settings: ReminderSettings,
  now: Date,
  loggedToday: boolean,
  days: number = REMINDER_DAYS_AHEAD,
): Date[] {
  if (!settings.enabled) return [];
  const todayKey = toDateKey(now);
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const at = dateFromKey(addDays(todayKey, i));
    at.setHours(settings.hour, settings.minute, 0, 0);
    if (i === 0 && (loggedToday || at.getTime() <= now.getTime())) continue;
    dates.push(at);
  }
  return dates;
}

export const REMINDER_LINES = [
  'Spent anything today? Log it before I forget. I never forget.',
  'Quick check-in. Anything to log? Even a coffee counts.',
  'I’m keeping score. Help me keep it accurately.',
  'Nothing logged today. Either a no-spend day or a mystery. Tell me which.',
  'Thirty seconds. One expense. I’ll be gracious about it.',
  'Your receipts miss me. Log today’s spending?',
  'A quiet day, or just an unlogged one? I’d like to know.',
];

/** Penney's line for a given day's reminder. Stable per date, varied across the week. */
export function reminderLine(dayKey: DateKey): string {
  let hash = 0;
  for (const ch of dayKey) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return REMINDER_LINES[Math.abs(hash) % REMINDER_LINES.length];
}
