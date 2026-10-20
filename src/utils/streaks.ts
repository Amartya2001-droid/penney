import { calculateDailyTargetPace } from '../engine/calculations';
import type { DateKey, Transaction, UserBudget } from '../types';
import { addDays, dateFromKey, daysBetween, monthKeyOf } from './dates';

/** Streak lengths Penney celebrates. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

/** How many recent days the streak card shows as dots. */
export const STREAK_HISTORY_DAYS = 14;

/** Rounding slack so a day spent exactly on target still counts. */
const EPSILON = 0.005;

export type StreakDayState =
  /** Discretionary spending stayed within that day's target. */
  | 'kept'
  /** Discretionary spending went over that day's target. */
  | 'missed'
  /** Today, still within its target so far. */
  | 'today'
  /** Today, already over its target. */
  | 'today_missed'
  /** Before the first logged expense, so there's nothing to judge. */
  | 'untracked';

export interface StreakDay {
  date: DateKey;
  discretionary: number;
  /** That day's discretionary allowance from the engine (same as the weekly chart). */
  target: number;
  state: StreakDayState;
}

export interface StreakSummary {
  /** First day counted: the date of the oldest logged expense. Null when nothing is logged. */
  trackingSince: DateKey | null;
  /**
   * Finished days in a row, ending yesterday, with discretionary spending within each day's target.
   * Today isn't counted until it's over; if today is already over target, this is 0.
   */
  current: number;
  /** Longest run of finished days within target since tracking began. */
  best: number;
  /**
   * Finished days in a row, ending yesterday, with no discretionary spending at all.
   * 0 once anything discretionary is logged today.
   */
  currentNoSpend: number;
  /** Today's discretionary spending is already over today's target. */
  overToday: boolean;
  /** Today went over target and ended a streak of this many days; otherwise 0. */
  endedToday: number;
  /** Discretionary spending today so far, today's target, and what's left within it. */
  spentToday: number;
  targetToday: number;
  leftToday: number;
  /** The last STREAK_HISTORY_DAYS days, oldest first, ending today. */
  recent: StreakDay[];
  /** The next milestone above `current`, or null past the last one. */
  nextMilestone: number | null;
  /** The milestone `current` just reached (current equals it exactly), for a celebration. */
  milestoneReached: number | null;
}

interface DayTotals {
  discretionary: Map<DateKey, number>;
  byMonth: Map<string, Transaction[]>;
}

function indexTransactions(transactions: Transaction[]): DayTotals {
  const discretionary = new Map<DateKey, number>();
  const byMonth = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const month = monthKeyOf(t.date);
    const list = byMonth.get(month);
    if (list) list.push(t);
    else byMonth.set(month, [t]);
    if (!t.is_essential) discretionary.set(t.date, (discretionary.get(t.date) ?? 0) + t.amount);
  }
  return { discretionary, byMonth };
}

/**
 * Savings streaks: days in a row where discretionary spending stayed within the engine's
 * daily target. Essentials never break a streak, and an unplanned essential only lowers the
 * targets of the days after it, exactly as it does for Penney's mood.
 *
 * Counting starts at the oldest logged expense, so days before someone started using Penney
 * don't count as free wins.
 */
export function summarizeStreaks(
  transactions: Transaction[],
  budget: UserBudget,
  todayKey: DateKey,
): StreakSummary {
  const past = transactions.filter((t) => t.date <= todayKey);
  const trackingSince = past.reduce<DateKey | null>(
    (oldest, t) => (oldest === null || t.date < oldest ? t.date : oldest),
    null,
  );
  const { discretionary, byMonth } = indexTransactions(past);

  // The engine only looks at the reference date's month, so pass it just that month's
  // transactions. Same result, without rescanning the whole history for every day.
  const targetFor = (date: DateKey) =>
    calculateDailyTargetPace(budget, byMonth.get(monthKeyOf(date)) ?? [], dateFromKey(date)).currentDailyTarget;

  const dayFor = (date: DateKey): StreakDay => {
    const spent = discretionary.get(date) ?? 0;
    const target = targetFor(date);
    const within = spent <= target + EPSILON;
    let state: StreakDayState;
    if (trackingSince === null || date < trackingSince) state = 'untracked';
    else if (date === todayKey) state = within ? 'today' : 'today_missed';
    else state = within ? 'kept' : 'missed';
    return { date, discretionary: spent, target, state };
  };

  let run = 0;
  let best = 0;
  let noSpendRun = 0;

  if (trackingSince !== null) {
    const finishedDays = daysBetween(trackingSince, todayKey);
    for (let i = 0; i < finishedDays; i++) {
      const day = dayFor(addDays(trackingSince, i));
      if (day.state === 'kept') {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
      noSpendRun = day.discretionary === 0 ? noSpendRun + 1 : 0;
    }
  }

  const recent = Array.from({ length: STREAK_HISTORY_DAYS }, (_, i) =>
    dayFor(addDays(todayKey, i - (STREAK_HISTORY_DAYS - 1))),
  );
  const today = recent[recent.length - 1];

  const brokenToday = today.state === 'today_missed';
  const current = brokenToday ? 0 : run;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > current) ?? null;

  return {
    trackingSince,
    current,
    best,
    overToday: brokenToday,
    currentNoSpend: today.discretionary > 0 ? 0 : noSpendRun,
    endedToday: brokenToday ? run : 0,
    spentToday: today.discretionary,
    targetToday: today.target,
    leftToday: Math.max(0, today.target - today.discretionary),
    recent,
    nextMilestone,
    milestoneReached: (STREAK_MILESTONES as readonly number[]).includes(current) ? current : null,
  };
}
