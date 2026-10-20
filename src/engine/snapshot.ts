import type { MonthSnapshot, Transaction, UserBudget } from '../types';
import { toDateKey } from '../utils/dates';
import {
  calculateActualDiscretionaryPace,
  calculateDailyTargetPace,
  calculatePaceStatus,
  getFixedExpensesTotal,
} from './calculations';
import { determineMood, getDiscretionaryFrequency } from './mood';

export function getMonthSnapshot(
  budget: UserBudget,
  transactions: Transaction[],
  refDate: Date = new Date(),
): MonthSnapshot {
  const target = calculateDailyTargetPace(budget, transactions, refDate);
  const actual = calculateActualDiscretionaryPace(transactions, refDate);
  const pace = calculatePaceStatus(target, actual);
  const frequency = getDiscretionaryFrequency(transactions, refDate);
  const mood = determineMood(pace.status, transactions, refDate);

  const projectedDiscretionary = actual.dailyPace * target.daysInMonth;
  const projectedMonthEndSavings =
    budget.monthly_income -
    getFixedExpensesTotal(budget.fixed_expenses) -
    target.unplannedEssentialTotal -
    projectedDiscretionary;

  return {
    dateKey: toDateKey(refDate),
    target,
    actual,
    pace,
    frequency,
    mood,
    projectedMonthEndSavings,
    savingsGoal: budget.savings_goal,
    savingsGoalAtRisk: projectedMonthEndSavings < budget.savings_goal,
  };
}
