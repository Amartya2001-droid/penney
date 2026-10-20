import { Category, type Transaction } from '../types';
import { formatMonthLabel, shiftMonthKey, summarizeMonth } from '../utils/monthSummary';
import { parseAmount } from '../utils/parseAmount';

function t(id: string, date: string, amount: number, category: Category, isEssential: boolean): Transaction {
  return { id, amount, category, date, is_essential: isEssential, description: '', created_at: `${date}T12:00:00.000Z` };
}

describe('summarizeMonth', () => {
  const data = [
    t('1', '2026-10-20', 20, Category.Takeout, false),
    t('2', '2026-10-20', 15, Category.Takeout, false),
    t('3', '2026-10-18', 100, Category.Groceries, true),
    t('4', '2026-09-30', 999, Category.Shopping, false),
  ];

  it('totals only the requested month', () => {
    const s = summarizeMonth(data, '2026-10');
    expect(s.count).toBe(3);
    expect(s.total).toBe(135);
    expect(s.essentialTotal).toBe(100);
    expect(s.discretionaryTotal).toBe(35);
  });

  it('groups by day (newest first) and by category (largest first)', () => {
    const s = summarizeMonth(data, '2026-10');
    expect(s.days.map((d) => [d.date, d.total])).toEqual([
      ['2026-10-20', 35],
      ['2026-10-18', 100],
    ]);
    expect(s.byCategory[0]).toEqual({ category: Category.Groceries, total: 100, count: 1 });
    expect(s.byCategory[1]).toEqual({ category: Category.Takeout, total: 35, count: 2 });
  });
});

describe('month keys', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  });

  it('formats a readable label', () => {
    expect(formatMonthLabel('2026-10')).toMatch(/October/);
  });
});

describe('parseAmount', () => {
  it('accepts common formats', () => {
    expect(parseAmount('12')).toBe(12);
    expect(parseAmount('$1,234.50')).toBe(1234.5);
    expect(parseAmount('12,50')).toBe(12.5);
  });

  it('rejects invalid input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('0', { allowZero: true })).toBe(0);
  });
});
