import { CATEGORY_META, FIXED_EXPENSE_KEYS } from '../constants/categories';
import { PACE_THRESHOLDS } from '../constants/thresholds';
import {
  Category,
  PaceStatus,
  type ActualDiscretionaryPace,
  type DailyTargetPace,
  type FixedExpenseKey,
  type FixedExpenses,
  type PaceResult,
  type Transaction,
  type UnplannedEssentialEvent,
  type UserBudget,
} from '../types';
import { getDaysInMonth, monthKeyOf, parseDateKey, toDateKey } from '../utils/dates';
import { sumAmounts } from '../utils/money';

export function getFixedExpensesTotal(fixed: FixedExpenses): number {
  return FIXED_EXPENSE_KEYS.reduce((sum, key) => sum + fixed[key], 0);
}

export function isDiscretionary(t: Transaction): boolean {
  return !t.is_essential;
}

/** Transactions in refDate's calendar month, dated on or before refDate. */
export function getMonthToDateTransactions(transactions: Transaction[], refDate: Date): Transaction[] {
  const refKey = toDateKey(refDate);
  const monthKey = monthKeyOf(refKey);
  return transactions.filter((t) => monthKeyOf(t.date) === monthKey && t.date <= refKey);
}

function sortChronologically(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

/**
 * Finds essential spending that wasn't budgeted:
 *  - Essentials with no fixed budget (Emergency repair) count in full.
 *  - Essentials with a fixed budget (Rent, Utilities, Insurance, Groceries) count only
 *    for the portion that pushes that category past its budgeted amount.
 *  - Discretionary categories manually flagged essential count in full.
 * Planned essentials within budget are already covered by fixed_expenses, so they're ignored.
 */
export function getUnplannedEssentialEvents(
  budget: UserBudget,
  monthTransactions: Transaction[],
): UnplannedEssentialEvent[] {
  const spentByKey: Record<FixedExpenseKey, number> = {
    rent: 0,
    utilities: 0,
    insurance: 0,
    groceries: 0,
  };
  const events: UnplannedEssentialEvent[] = [];

  for (const t of sortChronologically(monthTransactions)) {
    if (!t.is_essential) continue;

    const { day } = parseDateKey(t.date);
    const fixedKey = CATEGORY_META[t.category].fixedKey;

    if (fixedKey === null) {
      events.push({
        transactionId: t.id,
        day,
        amount: t.amount,
        reason: t.category === Category.EmergencyRepair ? 'emergency' : 'unbudgeted_essential',
      });
      continue;
    }

    const budgeted = budget.fixed_expenses[fixedKey];
    const before = spentByKey[fixedKey];
    const after = before + t.amount;
    spentByKey[fixedKey] = after;

    const overage = after - Math.max(before, budgeted);
    if (overage > 0) {
      events.push({ transactionId: t.id, day, amount: overage, reason: 'over_fixed_budget' });
    }
  }

  return events;
}

/**
 * Discretionary allowance rate for one day of the month.
 * Each unplanned essential is spread evenly over the days AFTER it happened:
 *  - It never shrinks allowance for days already lived (no retroactive penalty).
 *  - The day it happens gets a grace day, so the emergency itself never sours Penney's mood.
 *  - An emergency on the last day can't be spread forward; it comes out of savings.
 */
function dailyRateForDay(
  day: number,
  baseDailyTarget: number,
  events: UnplannedEssentialEvent[],
  daysInMonth: number,
): number {
  let rate = baseDailyTarget;
  for (const event of events) {
    const daysToAbsorb = daysInMonth - event.day;
    if (event.day < day && daysToAbsorb > 0) {
      rate -= event.amount / daysToAbsorb;
    }
  }
  return Math.max(0, rate);
}

/**
 * Daily Target Pace = (Income − Savings Goal − Essential Fixed) / Days In Month,
 * adjusted forward-only for unplanned essential expenses.
 */
export function calculateDailyTargetPace(
  budget: UserBudget,
  transactions: Transaction[],
  refDate: Date = new Date(),
): DailyTargetPace {
  const refKey = toDateKey(refDate);
  const { year, month, day } = parseDateKey(refKey);
  const daysInMonth = getDaysInMonth(year, month);
  const monthTxns = getMonthToDateTransactions(transactions, refDate);

  const rawDiscretionaryBudget =
    budget.monthly_income - budget.savings_goal - getFixedExpensesTotal(budget.fixed_expenses);
  const baseDiscretionaryBudget = Math.max(0, rawDiscretionaryBudget);
  const baseDailyTarget = baseDiscretionaryBudget / daysInMonth;

  const unplannedEvents = getUnplannedEssentialEvents(budget, monthTxns);
  const unplannedEssentialTotal = sumAmounts(unplannedEvents);
  const adjustedDiscretionaryBudget = Math.max(0, baseDiscretionaryBudget - unplannedEssentialTotal);

  let allowanceToDate = 0;
  for (let d = 1; d <= day; d++) {
    allowanceToDate += dailyRateForDay(d, baseDailyTarget, unplannedEvents, daysInMonth);
  }
  const currentDailyTarget = dailyRateForDay(day, baseDailyTarget, unplannedEvents, daysInMonth);

  const discretionary = monthTxns.filter(isDiscretionary);
  const spentBeforeToday = sumAmounts(discretionary.filter((t) => t.date < refKey));
  const spentToday = sumAmounts(discretionary.filter((t) => t.date === refKey));
  const daysLeftIncludingToday = daysInMonth - day + 1;
  const remainingDailyTarget =
    Math.max(0, adjustedDiscretionaryBudget - spentBeforeToday) / daysLeftIncludingToday;

  return {
    daysInMonth,
    dayOfMonth: day,
    daysLeftIncludingToday,
    baseDiscretionaryBudget,
    baseDailyTarget,
    unplannedEssentialTotal,
    adjustedDiscretionaryBudget,
    currentDailyTarget,
    allowanceToDate,
    remainingDailyTarget,
    leftToSpendToday: Math.max(0, remainingDailyTarget - spentToday),
    isBudgetFeasible: rawDiscretionaryBudget >= 0,
    unplannedEvents,
  };
}

/** Actual discretionary spending so far this month, and its average per day. */
export function calculateActualDiscretionaryPace(
  transactions: Transaction[],
  refDate: Date = new Date(),
): ActualDiscretionaryPace {
  const refKey = toDateKey(refDate);
  const { day } = parseDateKey(refKey);
  const discretionary = getMonthToDateTransactions(transactions, refDate).filter(isDiscretionary);
  const spentToDate = sumAmounts(discretionary);

  return {
    spentToDate,
    spentToday: sumAmounts(discretionary.filter((t) => t.date === refKey)),
    daysElapsed: day,
    dailyPace: spentToDate / day,
    transactionCount: discretionary.length,
  };
}

function classifyPace(percentOffPace: number | null): PaceStatus {
  if (percentOffPace === null) return PaceStatus.Over;
  if (percentOffPace < -PACE_THRESHOLDS.onTrackBandPct) return PaceStatus.Ahead;
  if (percentOffPace <= PACE_THRESHOLDS.onTrackBandPct) return PaceStatus.OnTrack;
  if (percentOffPace <= PACE_THRESHOLDS.slightlyOverMaxPct) return PaceStatus.SlightlyOver;
  return PaceStatus.Over;
}

/**
 * Compares cumulative discretionary spend to cumulative allowance to date.
 * Cumulative comparison means one big night out is balanced by quiet days, instead of
 * every individual day being judged on its own.
 */
export function calculatePaceStatus(
  target: DailyTargetPace,
  actual: ActualDiscretionaryPace,
): PaceResult {
  const allowanceToDate = target.allowanceToDate;
  const spentToDate = actual.spentToDate;
  const amountOverUnder = spentToDate - allowanceToDate;

  let percentOffPace: number | null;
  if (allowanceToDate > 0) {
    percentOffPace = (amountOverUnder / allowanceToDate) * 100;
  } else {
    percentOffPace = spentToDate > 0 ? null : 0;
  }

  return {
    status: classifyPace(percentOffPace),
    percentOffPace,
    amountOverUnder,
    allowanceToDate,
    spentToDate,
  };
}
