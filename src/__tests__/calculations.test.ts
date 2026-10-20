import {
  calculateActualDiscretionaryPace,
  calculateDailyTargetPace,
  calculatePaceStatus,
} from '../engine/calculations';
import { Category, PaceStatus, type Transaction, type UserBudget } from '../types';

const BUDGET: UserBudget = {
  monthly_income: 4200,
  savings_goal: 800,
  fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 },
};

let seq = 0;
function txn(date: string, amount: number, category: Category, isEssential: boolean): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    amount,
    category,
    date,
    is_essential: isEssential,
    description: '',
    created_at: `${date}T12:00:${String(seq % 60).padStart(2, '0')}.000Z`,
  };
}

// October 2026 has 31 days; discretionary budget is 4200 − 800 − 2250 = 1150.
const OCT_10 = new Date(2026, 9, 10, 12);

describe('calculateDailyTargetPace', () => {
  it('spreads the discretionary budget evenly over the month', () => {
    const target = calculateDailyTargetPace(BUDGET, [], OCT_10);
    expect(target.daysInMonth).toBe(31);
    expect(target.baseDiscretionaryBudget).toBe(1150);
    expect(target.baseDailyTarget).toBeCloseTo(1150 / 31, 6);
    expect(target.allowanceToDate).toBeCloseTo((1150 / 31) * 10, 6);
    expect(target.isBudgetFeasible).toBe(true);
  });

  it('ignores planned essentials that stay within their fixed budget', () => {
    const target = calculateDailyTargetPace(
      BUDGET,
      [txn('2026-10-01', 1500, Category.Rent, true), txn('2026-10-05', 200, Category.Groceries, true)],
      OCT_10,
    );
    expect(target.unplannedEssentialTotal).toBe(0);
    expect(target.adjustedDiscretionaryBudget).toBe(1150);
  });

  it('counts only the overage when a fixed category goes over budget', () => {
    const target = calculateDailyTargetPace(
      BUDGET,
      [txn('2026-10-02', 300, Category.Groceries, true), txn('2026-10-08', 250, Category.Groceries, true)],
      OCT_10,
    );
    expect(target.unplannedEssentialTotal).toBeCloseTo(100, 6);
    expect(target.unplannedEvents[0].reason).toBe('over_fixed_budget');
  });

  it('gives an emergency a grace day and never reduces past allowance', () => {
    const repair = [txn('2026-10-10', 210, Category.EmergencyRepair, true)];
    const sameDay = calculateDailyTargetPace(BUDGET, repair, OCT_10);
    const noRepair = calculateDailyTargetPace(BUDGET, [], OCT_10);
    expect(sameDay.allowanceToDate).toBeCloseTo(noRepair.allowanceToDate, 6);
    expect(sameDay.currentDailyTarget).toBeCloseTo(noRepair.currentDailyTarget, 6);

    const nextDay = calculateDailyTargetPace(BUDGET, repair, new Date(2026, 9, 11, 12));
    // 210 spread over the 21 days after Oct 10 = 10/day less from Oct 11.
    expect(nextDay.currentDailyTarget).toBeCloseTo(1150 / 31 - 10, 6);
    expect(nextDay.allowanceToDate).toBeCloseTo((1150 / 31) * 11 - 10, 6);
  });

  it('flags an infeasible budget and floors the discretionary budget at 0', () => {
    const target = calculateDailyTargetPace({ ...BUDGET, savings_goal: 3000 }, [], OCT_10);
    expect(target.isBudgetFeasible).toBe(false);
    expect(target.baseDiscretionaryBudget).toBe(0);
  });

  it('ignores transactions from other months and future dates', () => {
    const target = calculateDailyTargetPace(
      BUDGET,
      [txn('2026-09-30', 500, Category.EmergencyRepair, true), txn('2026-10-20', 500, Category.EmergencyRepair, true)],
      OCT_10,
    );
    expect(target.unplannedEssentialTotal).toBe(0);
  });
});

describe('calculatePaceStatus', () => {
  const statusFor = (spent: number) => {
    const target = calculateDailyTargetPace(BUDGET, [], OCT_10);
    const actual = calculateActualDiscretionaryPace(
      spent > 0 ? [txn('2026-10-05', spent, Category.Takeout, false)] : [],
      OCT_10,
    );
    return calculatePaceStatus(target, actual);
  };
  const allowance = (1150 / 31) * 10;

  it('classifies each band', () => {
    expect(statusFor(allowance * 0.8).status).toBe(PaceStatus.Ahead);
    expect(statusFor(allowance * 1.03).status).toBe(PaceStatus.OnTrack);
    expect(statusFor(allowance * 0.97).status).toBe(PaceStatus.OnTrack);
    expect(statusFor(allowance * 1.2).status).toBe(PaceStatus.SlightlyOver);
    expect(statusFor(allowance * 1.4).status).toBe(PaceStatus.Over);
  });

  it('reports the percentage off pace', () => {
    expect(statusFor(allowance * 1.2).percentOffPace).toBeCloseTo(20, 6);
    expect(statusFor(0).percentOffPace).toBeCloseTo(-100, 6);
  });
});
