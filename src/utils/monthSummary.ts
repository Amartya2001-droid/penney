import type { Category, DateKey, Transaction } from '../types';
import { getDaysInMonth, monthKeyOf, toDateKey } from './dates';

/** "YYYY-MM". */
export type MonthKey = string;

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
}

export interface DayGroup {
  date: DateKey;
  total: number;
  transactions: Transaction[];
}

export interface MonthSummary {
  monthKey: MonthKey;
  count: number;
  total: number;
  essentialTotal: number;
  discretionaryTotal: number;
  /** Highest total first. */
  byCategory: CategoryTotal[];
  /** Newest day first; transactions keep the order they were given in. */
  days: DayGroup[];
}

const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/;

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return monthKeyOf(toDateKey(now));
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const match = MONTH_KEY_RE.exec(key);
  if (!match) throw new Error(`Invalid month key: "${key}" (expected YYYY-MM)`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonthKey(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return getDaysInMonth(year, month);
}

export function formatMonthLabel(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  try {
    return new Date(year, month - 1, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  } catch {
    return key;
  }
}

/** Totals for one calendar month. `transactions` are expected newest first, as the store keeps them. */
export function summarizeMonth(transactions: Transaction[], monthKey: MonthKey): MonthSummary {
  const inMonth = transactions.filter((t) => monthKeyOf(t.date) === monthKey);
  const byCategory = new Map<Category, CategoryTotal>();
  const byDay = new Map<DateKey, DayGroup>();
  let essentialTotal = 0;
  let discretionaryTotal = 0;

  for (const t of inMonth) {
    if (t.is_essential) essentialTotal += t.amount;
    else discretionaryTotal += t.amount;

    const cat = byCategory.get(t.category) ?? { category: t.category, total: 0, count: 0 };
    cat.total += t.amount;
    cat.count += 1;
    byCategory.set(t.category, cat);

    const day = byDay.get(t.date) ?? { date: t.date, total: 0, transactions: [] };
    day.total += t.amount;
    day.transactions.push(t);
    byDay.set(t.date, day);
  }

  return {
    monthKey,
    count: inMonth.length,
    total: essentialTotal + discretionaryTotal,
    essentialTotal,
    discretionaryTotal,
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    days: [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}
