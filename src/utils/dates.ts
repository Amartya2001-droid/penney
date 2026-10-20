import type { DateKey } from '../types';

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const pad = (n: number): string => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: DateKey): { year: number; month: number; day: number } {
  const match = DATE_KEY_RE.exec(key);
  if (!match) throw new Error(`Invalid date key: "${key}" (expected YYYY-MM-DD)`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function isValidDateKey(key: string): boolean {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** Local-midnight Date for a key. */
export function dateFromKey(key: DateKey): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(year, month - 1, day);
}

/** month is 1-12. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** "YYYY-MM" portion of a date key. */
export function monthKeyOf(key: DateKey): string {
  return key.slice(0, 7);
}

/** Whole days from `fromKey` to `toKey` (negative if toKey is earlier). */
export function daysBetween(fromKey: DateKey, toKey: DateKey): number {
  const a = parseDateKey(fromKey);
  const b = parseDateKey(toKey);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / MS_PER_DAY,
  );
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}
