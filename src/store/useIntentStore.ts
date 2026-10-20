import { create } from 'zustand';

interface IntentState {
  /** Something outside the dashboard (a tapped reminder) asked for Add Expense to open. */
  addExpenseRequested: boolean;
  requestAddExpense: () => void;
  /** Called by the dashboard once it has opened Add Expense. */
  consumeAddExpense: () => void;
}

/**
 * One-shot UI requests that must survive a navigation but never be saved. Kept out of the URL
 * so a reload or the back button can't replay them.
 */
export const useIntentStore = create<IntentState>()((set) => ({
  addExpenseRequested: false,
  requestAddExpense: () => set({ addExpenseRequested: true }),
  consumeAddExpense: () => set({ addExpenseRequested: false }),
}));
