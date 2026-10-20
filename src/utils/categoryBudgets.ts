import { DISCRETIONARY_CATEGORIES } from '../constants/categories';
import type { Category, CategoryBudgets, DateKey, Transaction } from '../types';
import { getDaysInMonth, monthKeyOf, parseDateKey } from './dates';

/** From this share of the limit onward, a category counts as "nearly used up". */
export const CATEGORY_NEAR_LIMIT_SHARE = 0.85;

export type CategoryBudgetStatus =
  /** Within the limit and not spending faster than the month is passing. */
  | 'ok'
  /** Spent more than the limit's share for the days so far, but under 85% of it. */
  | 'fast'
  /** 85% or more of the limit used. */
  | 'near'
  /** Over the limit. */
  | 'over';

export interface CategoryBudgetLine {
  category: Category;
  limit: number;
  /** Everything logged in this category this month (up to today), essential-flagged or not. */
  spent: number;
  /** limit − spent; negative when over. */
  remaining: number;
  /** spent / limit; Infinity when a $0 limit has spending. */
  usedRatio: number;
  /** The limit's share for the days elapsed so far, e.g. 20/31 of the limit on the 20th. */
  expectedByNow: number;
  status: CategoryBudgetStatus;
}

export interface CategoryBudgetSummary {
  /** Only categories with a limit, in the usual category order. */
  lines: CategoryBudgetLine[];
  totalLimits: number;
}

/** Spending in one category during the month of `dateKey`, up to and including `upTo`. */
export function spentInCategory(
  transactions: Transaction[],
  category: Category,
  dateKey: DateKey,
  upTo: DateKey = dateKey,
  excludeId?: string,
): number {
  const month = monthKeyOf(dateKey);
  return transactions
    .filter(
      (t) => t.category === category && t.id !== excludeId && monthKeyOf(t.date) === month && t.date <= upTo,
    )
    .reduce((s, t) => s + t.amount, 0);
}

function classify(spent: number, limit: number, expectedByNow: number): CategoryBudgetStatus {
  if (spent > limit + 0.005) return 'over';
  if (limit > 0 && spent >= limit * CATEGORY_NEAR_LIMIT_SHARE) return 'near';
  if (spent > expectedByNow + 0.005) return 'fast';
  return 'ok';
}

/** How each limited category is doing this month, as of `todayKey`. */
export function summarizeCategoryBudgets(
  transactions: Transaction[],
  budgets: CategoryBudgets,
  todayKey: DateKey,
): CategoryBudgetSummary {
  const { year, month, day } = parseDateKey(todayKey);
  const elapsedShare = day / getDaysInMonth(year, month);

  const lines: CategoryBudgetLine[] = [];
  for (const category of DISCRETIONARY_CATEGORIES) {
    const limit = budgets[category];
    if (limit === undefined) continue;
    const spent = spentInCategory(transactions, category, todayKey);
    const expectedByNow = limit * elapsedShare;
    lines.push({
      category,
      limit,
      spent,
      remaining: limit - spent,
      usedRatio: limit > 0 ? spent / limit : spent > 0 ? Infinity : 0,
      expectedByNow,
      status: classify(spent, limit, expectedByNow),
    });
  }

  return { lines, totalLimits: lines.reduce((s, l) => s + l.limit, 0) };
}

export interface CategoryImpact {
  limit: number;
  /** Already spent in the category that month, not counting the expense being edited. */
  spentBefore: number;
  /** What's left after this expense (negative = over). */
  remainingAfter: number;
}

/**
 * What a new or edited expense would do to its category's limit, for the add-expense form.
 * Null when the category has no limit.
 */
export function categoryImpact(
  transactions: Transaction[],
  budgets: CategoryBudgets,
  category: Category,
  dateKey: DateKey,
  amount: number,
  editingId?: string,
): CategoryImpact | null {
  const limit = budgets[category];
  if (limit === undefined) return null;
  const { year, month } = parseDateKey(dateKey);
  const monthEnd = `${monthKeyOf(dateKey)}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
  const spentBefore = spentInCategory(transactions, category, dateKey, monthEnd, editingId);
  return { limit, spentBefore, remainingAfter: limit - spentBefore - amount };
}
