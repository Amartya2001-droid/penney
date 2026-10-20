import { sanitizePersistedState } from '../store/sanitizePersisted';

const goodTxn = {
  id: 'a',
  amount: 12.5,
  category: 'takeout',
  date: '2026-10-20',
  is_essential: false,
  description: 'Lunch',
  created_at: '2026-10-20T12:00:00.000Z',
};

describe('sanitizePersistedState', () => {
  it('keeps valid data unchanged', () => {
    const budget = {
      monthly_income: 4000,
      savings_goal: 500,
      fixed_expenses: { rent: 1500, utilities: 100, insurance: 100, groceries: 400 },
    };
    const result = sanitizePersistedState({ budget, transactions: [goodTxn], commentaryLog: [] });
    expect(result.droppedRecords).toBe(0);
    expect(result.data.budget).toEqual(budget);
    expect(result.data.transactions).toEqual([goodTxn]);
  });

  it('skips unreadable and duplicate transactions and counts them', () => {
    const result = sanitizePersistedState({
      budget: null,
      transactions: [
        goodTxn,
        { ...goodTxn },
        { ...goodTxn, id: 'b', amount: -5 },
        { ...goodTxn, id: 'c', category: 'yachts' },
        { ...goodTxn, id: 'd', date: '2026-02-30' },
        'garbage',
      ],
      commentaryLog: [{ nope: true }],
    });
    expect(result.data.transactions.map((t) => t.id)).toEqual(['a']);
    expect(result.droppedRecords).toBe(5);
    expect(result.data.commentaryLog).toEqual([]);
  });

  it('fills in missing optional fields', () => {
    const { description: _d, created_at: _c, ...minimal } = goodTxn;
    const result = sanitizePersistedState({ transactions: [minimal] });
    expect(result.data.transactions[0].description).toBe('');
    expect(result.data.transactions[0].created_at).toBe('2026-10-20T12:00:00.000Z');
  });

  it('drops a malformed budget', () => {
    const result = sanitizePersistedState({ budget: { monthly_income: 'lots' }, transactions: [] });
    expect(result.data.budget).toBeNull();
    expect(result.droppedRecords).toBe(1);
  });

  it('handles non-object input', () => {
    expect(sanitizePersistedState(null).data).toEqual({
      budget: null,
      transactions: [],
      commentaryLog: [],
      appearance: 'system',
    });
  });

  it('keeps a valid appearance and defaults anything else to system', () => {
    expect(sanitizePersistedState({ appearance: 'dark' }).data.appearance).toBe('dark');
    expect(sanitizePersistedState({ appearance: 'neon' }).data.appearance).toBe('system');
    expect(sanitizePersistedState({}).data.appearance).toBe('system');
    expect(sanitizePersistedState({ appearance: 'neon' }).droppedRecords).toBe(0);
  });
});
