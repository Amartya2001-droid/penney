import { DISCRETIONARY_CATEGORIES } from '../constants/categories';
import { calculateDailyTargetPace } from '../engine/calculations';
import type { Category, DateKey, Transaction, UserBudget } from '../types';
import { dateFromKey, getDaysInMonth, monthKeyOf } from './dates';
import { parseMonthKey, shiftMonthKey, type MonthKey } from './monthSummary';

export interface MonthSeriesPoint {
  day: number;
  date: DateKey;
  /** Discretionary spending from the 1st through this day; null for days still to come. */
  spentToDate: number | null;
  /** The engine's allowance earned from the 1st through this day. */
  allowanceToDate: number;
}

export interface MonthSeries {
  monthKey: MonthKey;
  points: MonthSeriesPoint[];
  /** The month's discretionary budget after unplanned essentials known so far. */
  monthBudget: number;
  /** Last day with data (today for the current month, the last day for past months); 0 for future months. */
  lastDay: number;
}

const dayKey = (monthKey: MonthKey, day: number) => `${monthKey}-${String(day).padStart(2, '0')}`;

function monthTransactions(transactions: Transaction[], monthKey: MonthKey): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.date) === monthKey);
}

/**
 * Cumulative discretionary spending against the engine's cumulative allowance, day by day.
 * The allowance is exactly what Penney's pace bar compares against, so the two never disagree.
 */
export function monthSeries(
  transactions: Transaction[],
  budget: UserBudget,
  monthKey: MonthKey,
  todayKey: DateKey,
): MonthSeries {
  const { year, month } = parseMonthKey(monthKey);
  const daysInMonth = getDaysInMonth(year, month);
  const inMonth = monthTransactions(transactions, monthKey);

  const spentByDay = new Map<number, number>();
  for (const t of inMonth) {
    if (t.is_essential || t.date > todayKey) continue;
    const day = Number(t.date.slice(8, 10));
    spentByDay.set(day, (spentByDay.get(day) ?? 0) + t.amount);
  }

  const points: MonthSeriesPoint[] = [];
  let running = 0;
  let lastDay = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = dayKey(monthKey, day);
    const happened = date <= todayKey;
    running += spentByDay.get(day) ?? 0;
    if (happened) lastDay = day;
    points.push({
      day,
      date,
      spentToDate: happened ? running : null,
      allowanceToDate: calculateDailyTargetPace(budget, inMonth, dateFromKey(date)).allowanceToDate,
    });
  }

  // Use what was known on the last day with data, so a future month isn't judged early.
  const asOf = dayKey(monthKey, Math.max(1, lastDay));
  const monthBudget = calculateDailyTargetPace(budget, inMonth.filter((t) => t.date <= asOf), dateFromKey(asOf))
    .adjustedDiscretionaryBudget;

  return { monthKey, points, monthBudget, lastDay };
}

export interface CategoryShare {
  category: Category;
  total: number;
  count: number;
  /** Share of the month's discretionary spending, 0–1. */
  share: number;
}

export interface CategoryBreakdown {
  /** Discretionary categories with spending, largest first. */
  categories: CategoryShare[];
  discretionaryTotal: number;
  essentialTotal: number;
}

/** Where the month's discretionary money went, up to today. Essentials are totalled separately. */
export function categoryBreakdown(
  transactions: Transaction[],
  monthKey: MonthKey,
  todayKey: DateKey,
): CategoryBreakdown {
  const inMonth = monthTransactions(transactions, monthKey).filter((t) => t.date <= todayKey);
  const totals = new Map<Category, { total: number; count: number }>();
  let discretionaryTotal = 0;
  let essentialTotal = 0;

  for (const t of inMonth) {
    if (t.is_essential) {
      essentialTotal += t.amount;
      continue;
    }
    discretionaryTotal += t.amount;
    const entry = totals.get(t.category) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    totals.set(t.category, entry);
  }

  // Fixed category order breaks ties, so equal totals never swap places between renders.
  const order = (c: Category) => {
    const i = DISCRETIONARY_CATEGORIES.indexOf(c);
    return i === -1 ? DISCRETIONARY_CATEGORIES.length : i;
  };
  const categories = [...totals.entries()]
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      share: discretionaryTotal > 0 ? total / discretionaryTotal : 0,
    }))
    .sort((a, b) => b.total - a.total || order(a.category) - order(b.category));

  return { categories, discretionaryTotal, essentialTotal };
}

export interface MonthTotal {
  monthKey: MonthKey;
  discretionary: number;
  essential: number;
  /** That month's discretionary budget (from the current budget settings). */
  budget: number;
  /** The month isn't over yet, so its total is partial. */
  inProgress: boolean;
}

/**
 * Discretionary and essential totals for up to `count` months ending at `endMonthKey`, oldest
 * first. Starts no earlier than the month of the oldest expense, so a new user doesn't see a row
 * of empty months. Budgets use the current settings, since past budgets aren't stored.
 */
export function monthlyTotals(
  transactions: Transaction[],
  budget: UserBudget,
  endMonthKey: MonthKey,
  todayKey: DateKey,
  count = 6,
): MonthTotal[] {
  const oldest = transactions.reduce<DateKey | null>(
    (min, t) => (min === null || t.date < min ? t.date : min),
    null,
  );
  const firstAllowed = oldest ? monthKeyOf(oldest) : endMonthKey;

  const months: MonthTotal[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const monthKey = shiftMonthKey(endMonthKey, -i);
    if (monthKey < firstAllowed || monthKey > monthKeyOf(todayKey)) continue;
    const series = monthSeries(transactions, budget, monthKey, todayKey);
    const breakdown = categoryBreakdown(transactions, monthKey, todayKey);
    const { year, month } = parseMonthKey(monthKey);
    months.push({
      monthKey,
      discretionary: breakdown.discretionaryTotal,
      essential: breakdown.essentialTotal,
      budget: series.monthBudget,
      inProgress: series.lastDay < getDaysInMonth(year, month),
    });
  }
  return months;
}

/** Rounds an axis maximum up to a clean value (1, 1.5, 2, 2.5, 3, 4, 5, 6, or 8 times a power of ten). */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => scaled <= s + 1e-9) ?? 10;
  return step * power;
}

/** "$1.2K" style labels for axis ticks. */
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `$${Math.round(value)}`;
}
