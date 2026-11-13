import { Category, type Transaction } from '../types';
import { filterTransactions, transactionsToCsv, type TransactionFilter } from '../utils/transactionSearch';

const t = (id: string, date: string, description: string, amount: number, category = Category.Takeout): Transaction => ({
  id, date, description, amount, category, is_essential: category === Category.Groceries,
  created_at: `${date}T12:00:00.000Z`,
});
const data = [t('a', '2026-11-11', 'Friday Pizza', 12.5), t('b', '2026-10-10', 'Weekly shop', 40, Category.Groceries), t('c', '2026-11-09', 'Coffee', 3)];
const all: TransactionFilter = { month: null, kind: 'all', category: null, query: '' };

describe('expense search', () => {
  it('searches all months or the selected month, preserving input order', () => {
    expect(filterTransactions(data, all)).toEqual(data);
    expect(filterTransactions(data, { ...all, month: '2026-11' }).map((t) => t.id)).toEqual(['a', 'c']);
  });
  it('requires every query term and matches notes, category, date, and formatted amount', () => {
    expect(filterTransactions(data, { ...all, query: '  PIZZA  takeout 12.50 2026-11 ' })).toEqual([data[0]]);
    expect(filterTransactions(data, { ...all, query: 'pizza groceries' })).toEqual([]);
  });
  it('combines kind, category, period and query without mutating expenses', () => {
    const original = JSON.stringify(data);
    expect(filterTransactions(data, { month: '2026-10', kind: 'essential', category: Category.Groceries, query: 'shop' })).toEqual([data[1]]);
    expect(filterTransactions(data, { ...all, kind: 'discretionary', category: Category.Groceries })).toEqual([]);
    expect(JSON.stringify(data)).toBe(original);
  });
  it('returns no matches for missing terms and accepts whitespace-only searches', () => {
    expect(filterTransactions(data, { ...all, query: 'missing' })).toEqual([]);
    expect(filterTransactions(data, { ...all, query: ' \n ' })).toEqual(data);
  });
});

describe('expense CSV', () => {
  it('exports only supplied results with currency precision and spreadsheet-readable UTF-8', () => {
    expect(transactionsToCsv([data[0]])).toBe('\uFEFF"Date","Category","Type","Amount (CAD)","Note"\r\n"2026-11-11","Takeout","Discretionary","12.50","Friday Pizza"\r\n');
    expect(transactionsToCsv([]).split('\r\n')).toHaveLength(2);
  });
  it('quotes commas, line breaks, and embedded quotes', () => {
    expect(transactionsToCsv([t('x', '2026-11-11', 'Pizza, "large"\nshared', 5)])).toContain('"Pizza, ""large""\nshared"');
  });
  it.each(['=SUM(A1)', '+cmd', '-cmd', '@cmd', '  =cmd', '\t+cmd', '\r@cmd'])(
    'neutralizes spreadsheet formulas: %p', (note) => {
      expect(transactionsToCsv([t('x', '2026-11-11', note, 5)])).toContain(`"'${note}"`);
    },
  );
});
