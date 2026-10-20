import { Category, type CategoryBudgets, type Transaction } from '../types';
import {
  categoryImpact,
  spentInCategory,
  summarizeCategoryBudgets,
} from '../utils/categoryBudgets';
import { validateCategoryBudgets } from '../utils/validation';
import { sanitizePersistedState } from '../store/sanitizePersisted';
import { usePenneyStore } from '../store/usePenneyStore';

// babel-jest hoists this above the imports, so the store loads with in-memory storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let seq = 0;
function t(date: string, amount: number, category: Category, isEssential = false): Transaction {
  seq += 1;
  return {
    id: `c${seq}`,
    amount,
    category,
    date,
    is_essential: isEssential,
    description: '',
    created_at: `${date}T12:00:00.000Z`,
  };
}

// Oct 2026 has 31 days; on Oct 20, 20/31 of the month has passed.
const TODAY = '2026-10-20';
const SHARE = 20 / 31;

describe('summarizeCategoryBudgets', () => {
  const data = [
    t('2026-10-02', 40, Category.Takeout),
    t('2026-10-15', 25, Category.Takeout, true), // flagged essential, still takeout spending
    t('2026-09-30', 99, Category.Takeout), // last month
    t('2026-10-22', 50, Category.Takeout), // after today
    t('2026-10-05', 90, Category.Shopping),
    t('2026-10-06', 5, Category.Amazon),
    t('2026-10-07', 300, Category.Rent, true),
  ];

  it('includes only limited categories, in the usual order', () => {
    const budgets: CategoryBudgets = { [Category.Shopping]: 100, [Category.Takeout]: 120 };
    const s = summarizeCategoryBudgets(data, budgets, TODAY);
    expect(s.lines.map((l) => l.category)).toEqual([Category.Takeout, Category.Shopping]);
    expect(s.totalLimits).toBe(220);
  });

  it('counts this month up to today, including essential-flagged entries in the category', () => {
    const [takeout] = summarizeCategoryBudgets(data, { [Category.Takeout]: 120 }, TODAY).lines;
    expect(takeout.spent).toBe(65);
    expect(takeout.remaining).toBe(55);
    expect(takeout.expectedByNow).toBeCloseTo(120 * SHARE, 6);
    expect(takeout.status).toBe('ok'); // 65 < 77.42 expected so far
  });

  it('classifies fast, near, and over', () => {
    const status = (limit: number) =>
      summarizeCategoryBudgets(data, { [Category.Shopping]: limit }, TODAY).lines[0].status;
    expect(status(130)).toBe('fast'); // 90 > 83.9 expected, but under 85% of 130
    expect(status(100)).toBe('near'); // 90% used
    expect(status(80)).toBe('over');
    expect(status(200)).toBe('ok');
  });

  it('handles a $0 limit', () => {
    const lines = summarizeCategoryBudgets(data, { [Category.Amazon]: 0, [Category.Entertainment]: 0 }, TODAY).lines;
    expect(lines[0]).toMatchObject({ category: Category.Amazon, status: 'over', usedRatio: Infinity });
    expect(lines[1]).toMatchObject({ category: Category.Entertainment, status: 'ok', usedRatio: 0 });
  });
});

describe('categoryImpact', () => {
  const data = [t('2026-10-02', 40, Category.Takeout), t('2026-10-28', 30, Category.Takeout)];

  it('returns null without a limit', () => {
    expect(categoryImpact(data, {}, Category.Takeout, TODAY, 10)).toBeNull();
  });

  it('looks at the whole month of the expense and the amount being added', () => {
    const impact = categoryImpact(data, { [Category.Takeout]: 100 }, Category.Takeout, TODAY, 45);
    expect(impact).toEqual({ limit: 100, spentBefore: 70, remainingAfter: -15 });
  });

  it('leaves out the expense being edited', () => {
    const editing = data[0];
    const impact = categoryImpact(data, { [Category.Takeout]: 100 }, Category.Takeout, TODAY, 45, editing.id);
    expect(impact?.spentBefore).toBe(30);
    expect(impact?.remainingAfter).toBe(25);
  });

  it('uses the month of a back-dated expense', () => {
    const impact = categoryImpact(
      [...data, t('2026-09-10', 60, Category.Takeout)],
      { [Category.Takeout]: 100 },
      Category.Takeout,
      '2026-09-25',
      10,
    );
    expect(impact?.spentBefore).toBe(60);
    expect(spentInCategory(data, Category.Takeout, '2026-09-25')).toBe(0);
  });
});

describe('validation and loading', () => {
  it('accepts discretionary limits of 0 or more', () => {
    expect(validateCategoryBudgets({ [Category.Takeout]: 0, [Category.Shopping]: 250 })).toEqual([]);
  });

  it('rejects essentials, unknown categories, and bad amounts', () => {
    const errors = validateCategoryBudgets({
      [Category.Rent]: 100,
      [Category.Takeout]: -5,
      [Category.Amazon]: Number.NaN,
      ['yachts' as Category]: 10,
    });
    expect(errors).toHaveLength(4);
    expect(errors[0]).toMatch(/Rent is an essential/);
  });

  it('loads saved limits, skipping and counting unusable ones', () => {
    const result = sanitizePersistedState({
      categoryBudgets: { takeout: 120, rent: 100, shopping: 'lots', entertainment: 0 },
    });
    expect(result.data.categoryBudgets).toEqual({ takeout: 120, entertainment: 0 });
    expect(result.droppedRecords).toBe(2);
    expect(sanitizePersistedState({}).data.categoryBudgets).toEqual({});
  });
});

describe('store', () => {
  it('saves rounded limits, rejects invalid ones, and clears them on reset', () => {
    const store = usePenneyStore.getState();
    store.setCategoryBudgets({ [Category.Takeout]: 120.456 });
    expect(usePenneyStore.getState().categoryBudgets).toEqual({ [Category.Takeout]: 120.46 });

    expect(() => store.setCategoryBudgets({ [Category.Rent]: 100 })).toThrow(/essential/);
    expect(usePenneyStore.getState().categoryBudgets).toEqual({ [Category.Takeout]: 120.46 });

    store.resetAll();
    expect(usePenneyStore.getState().categoryBudgets).toEqual({});
  });
});
