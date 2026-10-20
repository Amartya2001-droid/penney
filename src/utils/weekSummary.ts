import { PACE_THRESHOLDS } from '../constants/thresholds';
import { calculateDailyTargetPace } from '../engine/calculations';
import { PaceStatus, type Category, type DateKey, type Transaction, type UserBudget } from '../types';
import { addDays, dateFromKey, parseDateKey } from './dates';

/** Weeks run Monday to Sunday. 0 = Sunday, 1 = Monday. */
export const WEEK_STARTS_ON = 1;

export interface WeekDay {
  date: DateKey;
  discretionary: number;
  essential: number;
  /** That day's discretionary allowance from the engine (includes unplanned-essential adjustments). */
  target: number;
  /** After today, so nothing is counted yet. */
  isFuture: boolean;
}

export interface WeekCategoryTotal {
  category: Category;
  total: number;
  count: number;
}

export interface WeekSummary {
  /** Monday of the week. */
  start: DateKey;
  /** Sunday of the week. */
  end: DateKey;
  days: WeekDay[];
  discretionaryTotal: number;
  essentialTotal: number;
  transactionCount: number;
  /** Sum of daily targets for days up to and including today. */
  targetToDate: number;
  /** Sum of daily targets for all seven days. */
  targetFullWeek: number;
  /** Elapsed days with no discretionary spending. */
  noSpendDays: number;
  elapsedDays: number;
  /** Elapsed day with the most discretionary spending, or null if nothing was spent. */
  biggestDay: WeekDay | null;
  /** Discretionary categories only, highest total first. */
  topCategories: WeekCategoryTotal[];
  /** Discretionary spend vs target so far; the same bands as the monthly pace. */
  status: PaceStatus;
  /** Percent over (+) or under (−) the target so far; null when there's no target. */
  percentOffTarget: number | null;
  /** An emergency or over-budget essential happened this week (it lowered later daily targets). */
  hadUnplannedEssential: boolean;
}

export function startOfWeek(key: DateKey, weekStartsOn: number = WEEK_STARTS_ON): DateKey {
  const weekday = dateFromKey(key).getDay();
  const back = (weekday - weekStartsOn + 7) % 7;
  return addDays(key, -back);
}

export function shiftWeek(weekStart: DateKey, weeks: number): DateKey {
  return addDays(weekStart, weeks * 7);
}

export function formatWeekRange(start: DateKey): string {
  const end = addDays(start, 6);
  const a = parseDateKey(start);
  const b = parseDateKey(end);
  const month = (key: DateKey) =>
    dateFromKey(key).toLocaleDateString('en-CA', { month: 'short' });
  if (a.year !== b.year) {
    return `${month(start)} ${a.day}, ${a.year} – ${month(end)} ${b.day}, ${b.year}`;
  }
  if (a.month !== b.month) return `${month(start)} ${a.day} – ${month(end)} ${b.day}`;
  return `${month(start)} ${a.day} – ${b.day}`;
}

function classify(percent: number | null): PaceStatus {
  if (percent === null) return PaceStatus.Over;
  if (percent < -PACE_THRESHOLDS.onTrackBandPct) return PaceStatus.Ahead;
  if (percent <= PACE_THRESHOLDS.onTrackBandPct) return PaceStatus.OnTrack;
  if (percent <= PACE_THRESHOLDS.slightlyOverMaxPct) return PaceStatus.SlightlyOver;
  return PaceStatus.Over;
}

/**
 * Summarises one Monday–Sunday week. `todayKey` decides which days have happened:
 * future days show their target but count toward nothing else.
 */
export function summarizeWeek(
  transactions: Transaction[],
  budget: UserBudget,
  weekStart: DateKey,
  todayKey: DateKey,
): WeekSummary {
  const start = startOfWeek(weekStart);
  const end = addDays(start, 6);
  const inWeek = transactions.filter((t) => t.date >= start && t.date <= end && t.date <= todayKey);

  const inWeekIds = new Set(inWeek.map((t) => t.id));
  let hadUnplannedEssential = false;

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const onDay = inWeek.filter((t) => t.date === date);
    const pace = calculateDailyTargetPace(budget, transactions, dateFromKey(date));
    if (pace.unplannedEvents.some((e) => inWeekIds.has(e.transactionId))) hadUnplannedEssential = true;
    days.push({
      date,
      discretionary: onDay.filter((t) => !t.is_essential).reduce((s, t) => s + t.amount, 0),
      essential: onDay.filter((t) => t.is_essential).reduce((s, t) => s + t.amount, 0),
      target: pace.currentDailyTarget,
      isFuture: date > todayKey,
    });
  }

  const elapsed = days.filter((d) => !d.isFuture);
  const discretionaryTotal = elapsed.reduce((s, d) => s + d.discretionary, 0);
  const essentialTotal = elapsed.reduce((s, d) => s + d.essential, 0);
  const targetToDate = elapsed.reduce((s, d) => s + d.target, 0);
  const targetFullWeek = days.reduce((s, d) => s + d.target, 0);

  const byCategory = new Map<Category, WeekCategoryTotal>();
  for (const t of inWeek) {
    if (t.is_essential) continue;
    const entry = byCategory.get(t.category) ?? { category: t.category, total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    byCategory.set(t.category, entry);
  }

  const biggest = elapsed.reduce<WeekDay | null>(
    (best, d) => (d.discretionary > 0 && (!best || d.discretionary > best.discretionary) ? d : best),
    null,
  );

  let percentOffTarget: number | null;
  if (targetToDate > 0) percentOffTarget = ((discretionaryTotal - targetToDate) / targetToDate) * 100;
  else percentOffTarget = discretionaryTotal > 0 ? null : 0;

  return {
    start,
    end,
    days,
    discretionaryTotal,
    essentialTotal,
    transactionCount: inWeek.length,
    targetToDate,
    targetFullWeek,
    noSpendDays: elapsed.filter((d) => d.discretionary === 0).length,
    elapsedDays: elapsed.length,
    biggestDay: biggest,
    topCategories: [...byCategory.values()].sort((a, b) => b.total - a.total),
    status: classify(percentOffTarget),
    percentOffTarget,
    hadUnplannedEssential,
  };
}

export interface WeekComparison {
  /** Previous week's discretionary spending over the same weekdays (e.g. Mon–Wed vs Mon–Wed). */
  previousSameDays: number;
  /** Percent change from that; null when the previous week spent nothing on those days. */
  percentChange: number | null;
}

/**
 * Compares this week with the same days of the previous week, so a half-finished week
 * isn't measured against a full one.
 */
export function compareWithPreviousWeek(current: WeekSummary, previous: WeekSummary): WeekComparison {
  const previousSameDays = previous.days
    .slice(0, current.elapsedDays)
    .reduce((s, d) => s + d.discretionary, 0);
  const percentChange =
    previousSameDays === 0 ? null : ((current.discretionaryTotal - previousSameDays) / previousSameDays) * 100;
  return { previousSameDays, percentChange };
}
