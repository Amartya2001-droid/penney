import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isEssentialCategory } from '../constants/categories';
import type { AppearancePreference } from '../constants/theme';
import type { NewTransactionInput, PenneyCommentary, Transaction, UserBudget } from '../types';
import { toDateKey } from '../utils/dates';
import { generateId } from '../utils/id';
import { roundCurrency } from '../utils/money';
import { validateBudget, validateTransactionInput } from '../utils/validation';
import { sanitizePersistedState, type PersistedPenneyData } from './sanitizePersisted';

const MAX_COMMENTARY_LOG = 60;
const STORE_VERSION = 3;

export interface PenneyState {
  budget: UserBudget | null;
  /** Newest first. */
  transactions: Transaction[];
  /** Daily Penney quotes, newest first. */
  commentaryLog: PenneyCommentary[];
  /** Light, dark, or follow the device. A device preference, so Reset all data keeps it. */
  appearance: AppearancePreference;
  /** True once persisted data has loaded from storage. Not persisted. */
  hasHydrated: boolean;
  /** Set when saved data was partly unreadable on load. Not persisted. */
  storageWarning: string | null;
}

export interface PenneyActions {
  /** Validates and saves the budget. Throws an Error listing problems if invalid. */
  setBudget: (budget: UserBudget) => void;
  /** Validates, completes, and saves a transaction. Returns it. Throws if invalid. */
  addTransaction: (input: NewTransactionInput) => Transaction;
  /** Validates and replaces an existing transaction's fields, keeping its id. Throws if invalid or missing. */
  updateTransaction: (id: string, input: NewTransactionInput) => Transaction;
  removeTransaction: (id: string) => void;
  /** Puts a previously removed transaction back exactly as it was (for undo). */
  restoreTransaction: (transaction: Transaction) => void;
  logCommentary: (commentary: PenneyCommentary) => void;
  resetAll: () => void;
  setAppearance: (appearance: AppearancePreference) => void;
  dismissStorageWarning: () => void;
  setHasHydrated: (value: boolean) => void;
}

export type PenneyStore = PenneyState & PenneyActions;

const initialData: PersistedPenneyData = {
  budget: null,
  transactions: [],
  commentaryLog: [],
  appearance: 'system',
};

function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.created_at.localeCompare(a.created_at);
  });
}

function assertValidInput(input: NewTransactionInput): void {
  const errors = validateTransactionInput(input);
  if (errors.length > 0) throw new Error(errors.join(' '));
}

export const usePenneyStore = create<PenneyStore>()(
  persist(
    (set, get) => ({
      ...initialData,
      hasHydrated: false,
      storageWarning: null,

      setBudget: (budget) => {
        const errors = validateBudget(budget);
        if (errors.length > 0) throw new Error(errors.join(' '));

        set({
          budget: {
            monthly_income: roundCurrency(budget.monthly_income),
            savings_goal: roundCurrency(budget.savings_goal),
            fixed_expenses: {
              rent: roundCurrency(budget.fixed_expenses.rent),
              utilities: roundCurrency(budget.fixed_expenses.utilities),
              insurance: roundCurrency(budget.fixed_expenses.insurance),
              groceries: roundCurrency(budget.fixed_expenses.groceries),
            },
          },
        });
      },

      addTransaction: (input) => {
        assertValidInput(input);

        const now = new Date();
        const transaction: Transaction = {
          id: generateId('txn'),
          amount: roundCurrency(input.amount),
          category: input.category,
          date: input.date ?? toDateKey(now),
          is_essential: input.is_essential ?? isEssentialCategory(input.category),
          description: input.description?.trim() ?? '',
          created_at: now.toISOString(),
        };

        set((state) => ({ transactions: sortNewestFirst([transaction, ...state.transactions]) }));
        return transaction;
      },

      updateTransaction: (id, input) => {
        assertValidInput(input);
        const existing = get().transactions.find((t) => t.id === id);
        if (!existing) throw new Error('That expense no longer exists. It may have been deleted.');

        const updated: Transaction = {
          ...existing,
          amount: roundCurrency(input.amount),
          category: input.category,
          date: input.date ?? existing.date,
          is_essential: input.is_essential ?? isEssentialCategory(input.category),
          description: input.description?.trim() ?? existing.description,
        };

        set((state) => ({
          transactions: sortNewestFirst(state.transactions.map((t) => (t.id === id ? updated : t))),
        }));
        return updated;
      },

      removeTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
      },

      restoreTransaction: (transaction) => {
        set((state) =>
          state.transactions.some((t) => t.id === transaction.id)
            ? state
            : { transactions: sortNewestFirst([transaction, ...state.transactions]) },
        );
      },

      logCommentary: (commentary) => {
        set((state) => ({
          commentaryLog: [
            commentary,
            ...state.commentaryLog.filter((c) => c.date_key !== commentary.date_key),
          ].slice(0, MAX_COMMENTARY_LOG),
        }));
      },

      resetAll: () => {
        set((state) => ({ ...initialData, appearance: state.appearance, storageWarning: null }));
      },

      setAppearance: (appearance) => {
        set({ appearance });
      },

      dismissStorageWarning: () => {
        set({ storageWarning: null });
      },

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },
    }),
    {
      name: 'penney-store',
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedPenneyData => ({
        budget: state.budget,
        transactions: state.transactions,
        commentaryLog: state.commentaryLog,
        appearance: state.appearance,
      }),
      // v2 added no fields; v3 added `appearance`. Validation in `merge` covers every shape.
      migrate: (persisted) => persisted as PersistedPenneyData,
      merge: (persisted, current) => {
        const { data, droppedRecords } = sanitizePersistedState(persisted);
        return {
          ...current,
          ...data,
          transactions: sortNewestFirst(data.transactions),
          storageWarning:
            droppedRecords > 0
              ? `${droppedRecords} saved ${droppedRecords === 1 ? 'record was' : 'records were'} unreadable and skipped.`
              : null,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[Penney] Failed to load saved data:', error);
          usePenneyStore.setState({
            storageWarning: "Your saved data couldn't be loaded. New changes will still be saved.",
          });
        }
        // Mark hydrated even on error so the app never hangs on a loading screen.
        (state ?? usePenneyStore.getState()).setHasHydrated(true);
      },
    },
  ),
);
