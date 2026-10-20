import { LINES_FINISHED, LINES_IN_PROGRESS, weeklyVerdict } from '../services/penney/weeklyVerdict';
import { Category, MoodState, PaceStatus, type Transaction, type UserBudget } from '../types';
import {
  compareWithPreviousWeek,
  formatWeekRange,
  shiftWeek,
  startOfWeek,
  summarizeWeek,
} from '../utils/weekSummary';

// Discretionary budget: 4200 − 800 − 2250 = 1150 per month.
const BUDGET: UserBudget = {
  monthly_income: 4200,
  savings_goal: 800,
  fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 },
};
const OCT_DAILY = 1150 / 31;
const SEP_DAILY = 1150 / 30;

let seq = 0;
function t(date: string, amount: number, category: Category, isEssential = false): Transaction {
  seq += 1;
  return {
    id: `w${seq}`,
    amount,
    category,
    date,
    is_essential: isEssential,
    description: '',
    created_at: `${date}T12:00:00.000Z`,
  };
}

describe('week boundaries', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-10-20')).toBe('2026-10-19'); // Tuesday
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19'); // Monday
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19'); // Sunday
  });

  it('shifts by whole weeks across months', () => {
    expect(shiftWeek('2026-10-19', -3)).toBe('2026-09-28');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
  });

  it('formats ranges within a month, across months, and across years', () => {
    expect(formatWeekRange('2026-10-19')).toBe('Oct 19 – 25');
    expect(formatWeekRange('2026-09-28')).toBe('Sep 28 – Oct 4');
    expect(formatWeekRange('2026-12-28')).toBe('Dec 28, 2026 – Jan 3, 2027');
  });
});

describe('summarizeWeek', () => {
  const data = [
    t('2026-10-19', 20, Category.Takeout),
    t('2026-10-20', 50, Category.Groceries, true),
    t('2026-10-21', 15, Category.Takeout),
    t('2026-10-21', 9, Category.Entertainment),
    t('2026-10-23', 500, Category.Shopping), // after "today"; must be ignored
    t('2026-10-18', 300, Category.Shopping), // previous week
  ];
  const week = summarizeWeek(data, BUDGET, '2026-10-21', '2026-10-21');

  it('covers Monday to Sunday and counts only days up to today', () => {
    expect(week.start).toBe('2026-10-19');
    expect(week.end).toBe('2026-10-25');
    expect(week.days).toHaveLength(7);
    expect(week.days.filter((d) => d.isFuture)).toHaveLength(4);
    expect(week.elapsedDays).toBe(3);
    expect(week.discretionaryTotal).toBe(44);
    expect(week.essentialTotal).toBe(50);
    expect(week.transactionCount).toBe(4);
  });

  it('uses the engine’s daily targets', () => {
    expect(week.targetToDate).toBeCloseTo(OCT_DAILY * 3, 6);
    expect(week.targetFullWeek).toBeCloseTo(OCT_DAILY * 7, 6);
  });

  it('reports no-spend days, the biggest day, and top categories', () => {
    expect(week.noSpendDays).toBe(1);
    expect(week.biggestDay?.date).toBe('2026-10-21');
    expect(week.topCategories.map((c) => [c.category, c.total, c.count])).toEqual([
      [Category.Takeout, 35, 2],
      [Category.Entertainment, 9, 1],
    ]);
  });

  it('classifies the week like the monthly pace', () => {
    expect(week.status).toBe(PaceStatus.Ahead);
    const over = summarizeWeek([t('2026-10-19', OCT_DAILY * 3 * 1.4, Category.Shopping)], BUDGET, '2026-10-19', '2026-10-21');
    expect(over.status).toBe(PaceStatus.Over);
    expect(over.percentOffTarget).toBeCloseTo(40, 6);
  });

  it('handles a week that spans two months', () => {
    const split = summarizeWeek([], BUDGET, '2026-09-28', '2026-10-10');
    expect(split.targetFullWeek).toBeCloseTo(SEP_DAILY * 3 + OCT_DAILY * 4, 6);
    expect(split.days.every((d) => !d.isFuture)).toBe(true);
  });

  it('flags unplanned essentials and lowers the following days’ targets', () => {
    const withRepair = summarizeWeek(
      [t('2026-10-19', 240, Category.EmergencyRepair, true)],
      BUDGET,
      '2026-10-19',
      '2026-10-25',
    );
    expect(withRepair.hadUnplannedEssential).toBe(true);
    expect(withRepair.days[0].target).toBeCloseTo(OCT_DAILY, 6); // grace day
    expect(withRepair.days[1].target).toBeCloseTo(OCT_DAILY - 240 / 12, 6); // spread over Oct 20–31
    expect(week.hadUnplannedEssential).toBe(false);
  });
});

describe('compareWithPreviousWeek', () => {
  it('compares only the same weekdays of last week', () => {
    const data = [
      t('2026-10-12', 10, Category.Takeout), // last Monday
      t('2026-10-13', 30, Category.Takeout), // last Tuesday
      t('2026-10-17', 200, Category.Shopping), // last Saturday: outside Mon–Tue
      t('2026-10-19', 20, Category.Takeout),
      t('2026-10-20', 40, Category.Takeout),
    ];
    const current = summarizeWeek(data, BUDGET, '2026-10-19', '2026-10-20');
    const previous = summarizeWeek(data, BUDGET, '2026-10-12', '2026-10-20');
    const cmp = compareWithPreviousWeek(current, previous);
    expect(cmp.previousSameDays).toBe(40);
    expect(cmp.percentChange).toBeCloseTo(50, 6);
  });

  it('returns null change when last week had nothing on those days', () => {
    const current = summarizeWeek([t('2026-10-19', 20, Category.Takeout)], BUDGET, '2026-10-19', '2026-10-19');
    const previous = summarizeWeek([], BUDGET, '2026-10-12', '2026-10-19');
    expect(compareWithPreviousWeek(current, previous).percentChange).toBeNull();
  });
});

describe('weeklyVerdict', () => {
  it('maps the status to Penney’s mood and stays stable for the same week', () => {
    const over = summarizeWeek([t('2026-10-19', 400, Category.Shopping)], BUDGET, '2026-10-19', '2026-10-21');
    const verdict = weeklyVerdict(over);
    expect(verdict.mood).toBe(MoodState.DeadpanDisappointed);
    expect(weeklyVerdict(over).message).toBe(verdict.message);
  });

  it('distinguishes an empty week in progress from an empty finished week', () => {
    const inProgress = summarizeWeek([], BUDGET, '2026-10-19', '2026-10-21');
    const finished = summarizeWeek([], BUDGET, '2026-10-12', '2026-10-21');
    expect(weeklyVerdict(inProgress).message).toMatch(/yet this week/);
    expect(weeklyVerdict(finished).message).toMatch(/whole week/);
  });

  it('uses present tense for a week in progress and past tense for a finished one', () => {
    const spend = [t('2026-10-12', 400, Category.Shopping), t('2026-10-19', 400, Category.Shopping)];
    const inProgress = weeklyVerdict(summarizeWeek(spend, BUDGET, '2026-10-19', '2026-10-21'));
    const finished = weeklyVerdict(summarizeWeek(spend, BUDGET, '2026-10-12', '2026-10-21'));
    expect(LINES_IN_PROGRESS[PaceStatus.Over]).toContain(inProgress.message);
    expect(LINES_FINISHED[PaceStatus.Over]).toContain(finished.message);
  });

  it('celebrates three or more no-spend days', () => {
    const quiet = summarizeWeek([t('2026-10-19', 5, Category.Takeout)], BUDGET, '2026-10-19', '2026-10-22');
    expect(weeklyVerdict(quiet).message).toMatch(/^3 no-spend days/);
  });

  it('adds the supportive note only when an unplanned essential happened', () => {
    const repair = summarizeWeek(
      [t('2026-10-19', 240, Category.EmergencyRepair, true), t('2026-10-20', 90, Category.Shopping)],
      BUDGET,
      '2026-10-19',
      '2026-10-21',
    );
    expect(weeklyVerdict(repair).note).toMatch(/unplanned essential/);
    expect(weeklyVerdict(summarizeWeek([], BUDGET, '2026-10-19', '2026-10-21')).note).toBeNull();
  });
});
