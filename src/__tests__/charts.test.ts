import { calculateDailyTargetPace } from '../engine/calculations';
import { Category, type Transaction, type UserBudget } from '../types';
import {
  categoryBreakdown,
  formatCompactCurrency,
  monthSeries,
  monthlyTotals,
  niceCeiling,
} from '../utils/charts';
import { dateFromKey } from '../utils/dates';

// Discretionary budget: 4200 − 800 − 2250 = 1150 per month.
const BUDGET: UserBudget = {
  monthly_income: 4200,
  savings_goal: 800,
  fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 },
};
const OCT_DAILY = 1150 / 31;
const TODAY = '2026-10-20';

let seq = 0;
function t(date: string, amount: number, category: Category, isEssential = false): Transaction {
  seq += 1;
  return {
    id: `ch${seq}`,
    amount,
    category,
    date,
    is_essential: isEssential,
    description: '',
    created_at: `${date}T12:00:00.000Z`,
  };
}

const data = [
  t('2026-10-01', 1500, Category.Rent, true),
  t('2026-10-02', 40, Category.Takeout),
  t('2026-10-02', 10, Category.Takeout),
  t('2026-10-10', 120, Category.Shopping),
  t('2026-10-19', 30, Category.Entertainment),
  t('2026-10-25', 999, Category.Shopping), // after today
  t('2026-09-15', 200, Category.Amazon),
  t('2026-08-03', 900, Category.Shopping),
];

describe('monthSeries', () => {
  const s = monthSeries(data, BUDGET, '2026-10', TODAY);

  it('has one point per day and stops the spending line at today', () => {
    expect(s.points).toHaveLength(31);
    expect(s.lastDay).toBe(20);
    expect(s.points[19].spentToDate).toBe(200);
    expect(s.points[20].spentToDate).toBeNull();
  });

  it('accumulates discretionary spending only', () => {
    expect(s.points[0].spentToDate).toBe(0); // rent on the 1st doesn't count
    expect(s.points[1].spentToDate).toBe(50);
    expect(s.points[9].spentToDate).toBe(170);
  });

  it('uses the engine’s allowance for every day', () => {
    expect(s.points[0].allowanceToDate).toBeCloseTo(OCT_DAILY, 6);
    expect(s.points[30].allowanceToDate).toBeCloseTo(1150, 6);
    expect(s.monthBudget).toBeCloseTo(1150, 6);
  });

  it('follows unplanned essentials exactly as the pace bar does', () => {
    const withRepair = [...data, t('2026-10-05', 260, Category.EmergencyRepair, true)];
    const series = monthSeries(withRepair, BUDGET, '2026-10', TODAY);
    const engine = calculateDailyTargetPace(BUDGET, withRepair, dateFromKey(TODAY));
    expect(series.points[19].allowanceToDate).toBeCloseTo(engine.allowanceToDate, 6);
    expect(series.monthBudget).toBeCloseTo(1150 - 260, 6);
  });

  it('shows a finished month in full and a future month with no spending line', () => {
    const sep = monthSeries(data, BUDGET, '2026-09', TODAY);
    expect(sep.lastDay).toBe(30);
    expect(sep.points[29].spentToDate).toBe(200);
    const nov = monthSeries(data, BUDGET, '2026-11', TODAY);
    expect(nov.lastDay).toBe(0);
    expect(nov.points.every((p) => p.spentToDate === null)).toBe(true);
  });
});

describe('categoryBreakdown', () => {
  it('ranks discretionary categories by total and totals essentials separately', () => {
    const b = categoryBreakdown(data, '2026-10', TODAY);
    expect(b.discretionaryTotal).toBe(200);
    expect(b.essentialTotal).toBe(1500);
    expect(b.categories.map((c) => [c.category, c.total, c.count])).toEqual([
      [Category.Shopping, 120, 1],
      [Category.Takeout, 50, 2],
      [Category.Entertainment, 30, 1],
    ]);
    expect(b.categories[0].share).toBeCloseTo(0.6, 6);
  });

  it('breaks ties in the usual category order', () => {
    const tie = [t('2026-10-03', 20, Category.Entertainment), t('2026-10-04', 20, Category.Takeout)];
    expect(categoryBreakdown(tie, '2026-10', TODAY).categories.map((c) => c.category)).toEqual([
      Category.Takeout,
      Category.Entertainment,
    ]);
  });

  it('is empty for a month with nothing discretionary', () => {
    const b = categoryBreakdown([t('2026-10-01', 1500, Category.Rent, true)], '2026-10', TODAY);
    expect(b.categories).toEqual([]);
    expect(b.discretionaryTotal).toBe(0);
  });
});

describe('monthlyTotals', () => {
  it('starts at the first month with data and marks the current month as in progress', () => {
    const months = monthlyTotals(data, BUDGET, '2026-10', TODAY);
    expect(months.map((m) => m.monthKey)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(months.map((m) => m.discretionary)).toEqual([900, 200, 200]);
    expect(months.map((m) => m.inProgress)).toEqual([false, false, true]);
    expect(months[0].budget).toBeCloseTo(1150, 6);
  });

  it('caps the window and never includes future months', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      t(`2026-${String(i + 1).padStart(2, '0')}-05`, 10, Category.Takeout),
    );
    expect(monthlyTotals(many, BUDGET, '2026-10', TODAY).map((m) => m.monthKey)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(monthlyTotals(many, BUDGET, '2026-12', TODAY).map((m) => m.monthKey).at(-1)).toBe('2026-10');
  });
});

describe('axis helpers', () => {
  it('rounds axis maximums up to clean values', () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(37)).toBe(40);
    expect(niceCeiling(1150)).toBe(1500);
    expect(niceCeiling(240)).toBe(250);
    expect(niceCeiling(100)).toBe(100);
  });

  it('formats compact currency ticks', () => {
    expect(formatCompactCurrency(0)).toBe('$0');
    expect(formatCompactCurrency(625)).toBe('$625');
    expect(formatCompactCurrency(1000)).toBe('$1K');
    expect(formatCompactCurrency(1250)).toBe('$1.3K');
  });
});
