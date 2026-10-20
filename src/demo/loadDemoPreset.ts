import { usePenneyStore } from '../store/usePenneyStore';
import { validateBudget, validateTransactionInput } from '../utils/validation';
import { buildDemoPreset, type DemoPresetId } from './presets';

/**
 * Replaces the budget and all transactions with a demo preset, in one persisted update.
 * Today's quote is cleared too, so Penney writes a fresh line for the preset's situation.
 * Throws if the generated data fails the same validation the store uses.
 */
export function loadDemoPreset(id: DemoPresetId, refDate: Date = new Date()): void {
  const data = buildDemoPreset(id, refDate);

  const errors = [
    ...validateBudget(data.budget),
    ...data.transactions.flatMap((t) => validateTransactionInput(t)),
  ];
  if (errors.length > 0) {
    throw new Error(`Demo preset "${id}" is invalid: ${errors.join(' ')}`);
  }

  usePenneyStore.setState({
    budget: data.budget,
    transactions: data.transactions,
    commentaryLog: [],
  });
}

/** Clears the budget, transactions, and quotes, back to a first-run state. */
export function resetToEmpty(): void {
  usePenneyStore.getState().resetAll();
}
