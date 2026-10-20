import { Category, MoodState, type PenneyCommentary, type Transaction, type UserBudget } from '../types';
import { buildExport } from '../utils/exportData';
import { parseBackup, planMerge, type ParsedBackup } from '../utils/importBackup';
import { usePenneyStore } from '../store/usePenneyStore';

// babel-jest hoists this above the imports, so the store loads with in-memory storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const BUDGET: UserBudget = {
  monthly_income: 4200,
  savings_goal: 800,
  fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 },
};

function t(id: string, date: string, amount: number, category = Category.Takeout): Transaction {
  return {
    id,
    amount,
    category,
    date,
    is_essential: category === Category.Rent,
    description: `note ${id}`,
    created_at: `${date}T12:00:00.000Z`,
  };
}

const QUOTE: PenneyCommentary = {
  id: 'q1',
  date_key: '2026-10-20',
  mood: MoodState.Neutral,
  message: 'Fine. Everything is fine.',
  source: 'fallback',
  generated_at: '2026-10-20T09:00:00.000Z',
};

const TXNS = [t('a', '2026-10-20', 12.5), t('b', '2026-10-02', 1500, Category.Rent), t('c', '2026-09-14', 30)];

function parsedOrThrow(text: string): ParsedBackup {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(result.error);
  return result.backup;
}

describe('parseBackup', () => {
  it('reads back exactly what Export backup writes', () => {
    const json = JSON.stringify(buildExport(BUDGET, TXNS, [QUOTE], { [Category.Takeout]: 150 }), null, 2);
    const backup = parsedOrThrow(json);
    expect(backup.data).toEqual({
      budget: BUDGET,
      transactions: TXNS,
      commentaryLog: [QUOTE],
      categoryBudgets: { takeout: 150 },
    });
    expect(backup.skipped).toBe(0);
    expect(backup.firstDate).toBe('2026-09-14');
    expect(backup.lastDate).toBe('2026-10-20');
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts older backups without category limits', () => {
    const { categoryBudgets: _omit, ...older } = buildExport(BUDGET, TXNS, []);
    expect(parsedOrThrow(JSON.stringify(older)).data.categoryBudgets).toEqual({});
  });

  it('tolerates extra text around pasted JSON', () => {
    const json = JSON.stringify(buildExport(BUDGET, TXNS, []));
    expect(parsedOrThrow(`Penney backup\n\n${json}\n\nSent from my phone`).data.transactions).toHaveLength(3);
  });

  it('skips and counts unreadable records but keeps the rest', () => {
    // A copy, so the junk records don't leak into the shared fixture.
    const backup = buildExport(BUDGET, [...TXNS], []) as unknown as { transactions: unknown[] };
    backup.transactions.push({ id: 'bad', amount: -4 }, 'nonsense');
    const parsed = parsedOrThrow(JSON.stringify(backup));
    expect(parsed.data.transactions).toHaveLength(3);
    expect(parsed.skipped).toBe(2);
  });

  it.each([
    ['', /Nothing to read/],
    ['   ', /Nothing to read/],
    ['hello there', /should start with \{/],
    ['{"app": "penney", "transactions": [', /copied all of it/],
    ['{"app": "something-else", "transactions": []}', /isn't a Penney backup/],
    ['[1, 2, 3]', /isn't a Penney backup/],
    ['{"app": "penney", "budget": null, "transactions": []}', /nothing to restore/],
    ['{"app": "penney", "budget": {"monthly_income": "lots"}, "transactions": [{"id": 1}]}', /None of the records/],
  ])('explains what is wrong with %j', (text, message) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it('rejects anything far too large to be a backup', () => {
    const result = parseBackup(`{"app":"penney","x":"${'a'.repeat(5_000_001)}"}`);
    expect(result.ok).toBe(false);
  });
});

describe('planMerge', () => {
  it('adds only expenses that are not already here', () => {
    const current = [t('a', '2026-10-20', 12.5)];
    const plan = planMerge(current, TXNS);
    expect(plan.toAdd.map((x) => x.id)).toEqual(['b', 'c']);
    expect(plan.alreadyHere).toBe(1);
  });

  it('treats the same purchase under a different ID as already here', () => {
    const copy = { ...TXNS[0], id: 'other-device-id' };
    expect(planMerge(TXNS, [copy]).toAdd).toEqual([]);
  });

  it('adds nothing when the same backup is imported twice', () => {
    const first = planMerge([], TXNS);
    expect(planMerge(first.toAdd, TXNS).toAdd).toEqual([]);
  });
});

describe('store import actions', () => {
  beforeEach(() => {
    usePenneyStore.getState().resetAll();
  });

  it('replaces data and keeps device settings, and can be undone', () => {
    const store = usePenneyStore.getState();
    store.setBudget({ ...BUDGET, savings_goal: 100 });
    store.setAppearance('dark');
    store.setReminder({ enabled: true, hour: 21 });
    const before = {
      budget: usePenneyStore.getState().budget,
      transactions: usePenneyStore.getState().transactions,
      commentaryLog: usePenneyStore.getState().commentaryLog,
      categoryBudgets: usePenneyStore.getState().categoryBudgets,
    };

    store.replaceAllData(parsedOrThrow(JSON.stringify(buildExport(BUDGET, TXNS, [QUOTE], { takeout: 150 }))).data);
    let state = usePenneyStore.getState();
    expect(state.budget).toEqual(BUDGET);
    expect(state.transactions.map((x) => x.id)).toEqual(['a', 'b', 'c']); // newest first
    expect(state.categoryBudgets).toEqual({ takeout: 150 });
    expect(state.appearance).toBe('dark');
    expect(state.reminder).toMatchObject({ enabled: true, hour: 21 });

    store.replaceAllData(before);
    state = usePenneyStore.getState();
    expect(state.budget?.savings_goal).toBe(100);
    expect(state.transactions).toEqual([]);
  });

  it('refuses an invalid budget without changing anything', () => {
    const store = usePenneyStore.getState();
    const bad = { budget: { ...BUDGET, savings_goal: 99_999 }, transactions: TXNS, commentaryLog: [], categoryBudgets: {} };
    expect(() => store.replaceAllData(bad)).toThrow(/exceed/);
    expect(usePenneyStore.getState().transactions).toEqual([]);
  });

  it('adds expenses in order and ignores IDs already present', () => {
    const store = usePenneyStore.getState();
    expect(store.addTransactions([TXNS[2], TXNS[0]])).toBe(2);
    expect(store.addTransactions(TXNS)).toBe(1);
    expect(usePenneyStore.getState().transactions.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
