import { MILESTONE_LINES, streakLine } from '../services/penney/streakLine';
import { Category, type Transaction, type UserBudget } from '../types';
import { addDays } from '../utils/dates';
import { STREAK_HISTORY_DAYS, summarizeStreaks } from '../utils/streaks';

// Discretionary budget: 4200 − 800 − 2250 = 1150 per month.
const BUDGET: UserBudget = {
  monthly_income: 4200,
  savings_goal: 800,
  fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 },
};
const OCT_DAILY = 1150 / 31; // ≈ 37.10
const SEP_DAILY = 1150 / 30; // ≈ 38.33
const TODAY = '2026-10-20';

let seq = 0;
function t(date: string, amount: number, category: Category = Category.Takeout, isEssential = false): Transaction {
  seq += 1;
  return {
    id: `s${seq}`,
    amount,
    category,
    date,
    is_essential: isEssential,
    description: '',
    created_at: `${date}T12:00:00.000Z`,
  };
}

/** One small purchase a day from `from` for `count` days. */
function daily(from: string, count: number, amount = 10): Transaction[] {
  return Array.from({ length: count }, (_, i) => t(addDays(from, i), amount));
}

describe('summarizeStreaks', () => {
  it('has nothing to count before the first expense', () => {
    const s = summarizeStreaks([], BUDGET, TODAY);
    expect(s.trackingSince).toBeNull();
    expect(s.current).toBe(0);
    expect(s.best).toBe(0);
    expect(s.recent.every((d) => d.state === 'untracked')).toBe(true);
    expect(streakLine(s, TODAY)).toMatch(/start counting/);
  });

  it('counts finished days within target, starting at the oldest expense', () => {
    const s = summarizeStreaks(daily('2026-10-10', 10), BUDGET, TODAY);
    expect(s.trackingSince).toBe('2026-10-10');
    expect(s.current).toBe(10); // Oct 10–19; today isn't finished
    expect(s.best).toBe(10);
    expect(s.endedToday).toBe(0);
  });

  it('counts a day exactly on target, and days with nothing spent', () => {
    const s = summarizeStreaks([t('2026-10-15', Math.round(OCT_DAILY * 100) / 100)], BUDGET, TODAY);
    expect(s.current).toBe(5); // Oct 15 on target, Oct 16–19 nothing spent
    expect(s.currentNoSpend).toBe(4);
  });

  it('resets after a day over target but remembers the best run', () => {
    const data = [...daily('2026-10-01', 8), t('2026-10-09', 80), ...daily('2026-10-10', 3)];
    const s = summarizeStreaks(data, BUDGET, '2026-10-15');
    expect(s.best).toBe(8); // Oct 1–8
    expect(s.current).toBe(5); // Oct 10–14
    expect(s.recent.find((d) => d.date === '2026-10-09')?.state).toBe('missed');
  });

  it('never lets essentials break a streak', () => {
    const data = [t('2026-10-15', 1500, Category.Rent, true), t('2026-10-16', 300, Category.Groceries, true)];
    expect(summarizeStreaks(data, BUDGET, TODAY).current).toBe(5);
  });

  it('keeps today out of the count while it’s within target', () => {
    const s = summarizeStreaks([...daily('2026-10-15', 5), t(TODAY, 12)], BUDGET, TODAY);
    expect(s.current).toBe(5);
    expect(s.spentToday).toBe(12);
    expect(s.targetToday).toBeCloseTo(OCT_DAILY, 6);
    expect(s.leftToday).toBeCloseTo(OCT_DAILY - 12, 6);
    expect(s.recent[s.recent.length - 1].state).toBe('today');
  });

  it('ends the streak as soon as today goes over target', () => {
    const s = summarizeStreaks([...daily('2026-10-15', 5), t(TODAY, 60)], BUDGET, TODAY);
    expect(s.current).toBe(0);
    expect(s.overToday).toBe(true);
    expect(s.endedToday).toBe(5);
    expect(s.leftToday).toBe(0);
    expect(s.recent[s.recent.length - 1].state).toBe('today_missed');
    expect(streakLine(s, TODAY)).toMatch(/5-day streak ends here/);
  });

  it('says so when today is over target but there was no streak to end', () => {
    const s = summarizeStreaks([t('2026-10-19', 80), t(TODAY, 60)], BUDGET, TODAY);
    expect(s.overToday).toBe(true);
    expect(s.endedToday).toBe(0);
    expect(streakLine(s, TODAY)).toMatch(/already over/);
  });

  it('uses lowered targets after an unplanned essential, but not on the day it happened', () => {
    // A $240 repair on Oct 18 is spread over Oct 19–31 (13 days), lowering those targets.
    const repair = t('2026-10-18', 240, Category.EmergencyRepair, true);
    const lowered = OCT_DAILY - 240 / 13; // ≈ 18.64
    const data = [repair, t('2026-10-18', 30), t('2026-10-19', 30)];
    const s = summarizeStreaks(data, BUDGET, TODAY);
    const oct18 = s.recent.find((d) => d.date === '2026-10-18');
    const oct19 = s.recent.find((d) => d.date === '2026-10-19');
    expect(oct18?.target).toBeCloseTo(OCT_DAILY, 6);
    expect(oct18?.state).toBe('kept');
    expect(oct19?.target).toBeCloseTo(lowered, 6);
    expect(oct19?.state).toBe('missed');
    expect(s.current).toBe(0);
  });

  it('uses each month’s own target across a month boundary', () => {
    // $38 is within September's daily target but over October's.
    const data = [t('2026-09-29', 38), t('2026-09-30', 38), t('2026-10-01', 38)];
    const s = summarizeStreaks(data, BUDGET, '2026-10-02');
    expect(SEP_DAILY).toBeGreaterThan(38);
    expect(OCT_DAILY).toBeLessThan(38);
    expect(s.best).toBe(2);
    expect(s.current).toBe(0);
  });

  it('tracks no-spend days separately and resets them when today has spending', () => {
    const data = [t('2026-10-15', 10)];
    expect(summarizeStreaks(data, BUDGET, TODAY).currentNoSpend).toBe(4);
    expect(summarizeStreaks([...data, t(TODAY, 3)], BUDGET, TODAY).currentNoSpend).toBe(0);
  });

  it('ignores expenses dated after today', () => {
    const s = summarizeStreaks([...daily('2026-10-17', 3), t('2026-10-25', 500)], BUDGET, TODAY);
    expect(s.current).toBe(3);
  });

  it('reports milestones', () => {
    const atSeven = summarizeStreaks(daily('2026-10-13', 7), BUDGET, TODAY);
    expect(atSeven.current).toBe(7);
    expect(atSeven.milestoneReached).toBe(7);
    expect(atSeven.nextMilestone).toBe(14);
    expect(streakLine(atSeven, TODAY)).toBe(MILESTONE_LINES[7]);

    const atFive = summarizeStreaks(daily('2026-10-15', 5), BUDGET, TODAY);
    expect(atFive.milestoneReached).toBeNull();
    expect(atFive.nextMilestone).toBe(7);
  });

  it('shows the last two weeks oldest first, ending today, padding days before tracking', () => {
    const s = summarizeStreaks(daily('2026-10-17', 3), BUDGET, TODAY);
    expect(s.recent).toHaveLength(STREAK_HISTORY_DAYS);
    expect(s.recent[0].date).toBe(addDays(TODAY, -(STREAK_HISTORY_DAYS - 1)));
    expect(s.recent[s.recent.length - 1].date).toBe(TODAY);
    expect(s.recent.filter((d) => d.state === 'untracked')).toHaveLength(STREAK_HISTORY_DAYS - 4);
  });
});

describe('streakLine', () => {
  it('greets the first day and stays stable for the same day', () => {
    const first = summarizeStreaks([t(TODAY, 5)], BUDGET, TODAY);
    expect(streakLine(first, TODAY)).toMatch(/^Day one/);

    const ongoing = summarizeStreaks(daily('2026-10-15', 5), BUDGET, TODAY);
    expect(streakLine(ongoing, TODAY)).toMatch(/^5/);
    expect(streakLine(ongoing, TODAY)).toBe(streakLine(ongoing, TODAY));
  });
});
