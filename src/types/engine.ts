import type { DateKey } from './finance';

export enum PaceStatus {
  Ahead = 'ahead',
  OnTrack = 'on_track',
  SlightlyOver = 'slightly_over',
  Over = 'over',
}

export enum MoodState {
  Thriving = 'thriving',
  Neutral = 'neutral',
  Concerned = 'concerned',
  DeadpanDisappointed = 'deadpan_disappointed',
}

export type UnplannedReason =
  | 'emergency' // e.g. an emergency repair
  | 'over_fixed_budget' // essential spend beyond its budgeted fixed amount
  | 'unbudgeted_essential'; // a normally discretionary category flagged essential

/** An essential expense that wasn't budgeted, so it shrinks the discretionary pool. */
export interface UnplannedEssentialEvent {
  transactionId: string;
  /** Day of month (1-31) the expense happened. */
  day: number;
  /** The unbudgeted portion of the transaction. */
  amount: number;
  reason: UnplannedReason;
}

export interface DailyTargetPace {
  daysInMonth: number;
  dayOfMonth: number;
  daysLeftIncludingToday: number;
  /** Income − savings goal − fixed expenses (floored at 0). */
  baseDiscretionaryBudget: number;
  /** baseDiscretionaryBudget / daysInMonth. */
  baseDailyTarget: number;
  unplannedEssentialTotal: number;
  /** Base discretionary budget minus unplanned essentials (floored at 0). */
  adjustedDiscretionaryBudget: number;
  /** Today's allowance rate after emergency adjustments. */
  currentDailyTarget: number;
  /** Total discretionary allowance earned from day 1 through today. Never reduced retroactively. */
  allowanceToDate: number;
  /** Forward-looking: what's left of the adjusted budget, spread over today and the remaining days. */
  remainingDailyTarget: number;
  /** remainingDailyTarget minus what was already spent today (floored at 0). */
  leftToSpendToday: number;
  /** False if the savings goal plus fixed expenses exceed income. */
  isBudgetFeasible: boolean;
  unplannedEvents: UnplannedEssentialEvent[];
}

export interface ActualDiscretionaryPace {
  spentToDate: number;
  spentToday: number;
  daysElapsed: number;
  /** spentToDate / daysElapsed. */
  dailyPace: number;
  transactionCount: number;
}

export interface PaceResult {
  status: PaceStatus;
  /**
   * Percent over (+) or under (−) the allowance to date.
   * null when the allowance is 0 but money was spent (percentage is undefined).
   */
  percentOffPace: number | null;
  /** spentToDate − allowanceToDate (positive = over). */
  amountOverUnder: number;
  allowanceToDate: number;
  spentToDate: number;
}

export interface DiscretionaryFrequency {
  windowDays: number;
  /** Distinct days with at least one discretionary purchase in the window. */
  activeDays: number;
  transactionCount: number;
  total: number;
  isFrequent: boolean;
}

export interface MonthSnapshot {
  dateKey: DateKey;
  target: DailyTargetPace;
  actual: ActualDiscretionaryPace;
  pace: PaceResult;
  frequency: DiscretionaryFrequency;
  mood: MoodState;
  /** Savings at month end if the current discretionary pace continues. */
  projectedMonthEndSavings: number;
  savingsGoal: number;
  savingsGoalAtRisk: boolean;
}
