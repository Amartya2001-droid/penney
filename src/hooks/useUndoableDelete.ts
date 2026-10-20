import { useCallback, useState } from 'react';
import { usePenneyStore } from '../store/usePenneyStore';
import type { Transaction } from '../types';

/** Deletes immediately and remembers the last deletion so it can be undone from a toast. */
export function useUndoableDelete() {
  const removeTransaction = usePenneyStore((s) => s.removeTransaction);
  const restoreTransaction = usePenneyStore((s) => s.restoreTransaction);
  const [lastDeleted, setLastDeleted] = useState<Transaction | null>(null);

  const deleteTransaction = useCallback(
    (transaction: Transaction) => {
      removeTransaction(transaction.id);
      setLastDeleted(transaction);
    },
    [removeTransaction],
  );

  const undo = useCallback(() => {
    if (lastDeleted) restoreTransaction(lastDeleted);
    setLastDeleted(null);
  }, [lastDeleted, restoreTransaction]);

  const dismiss = useCallback(() => setLastDeleted(null), []);

  return { deleteTransaction, lastDeleted, undo, dismiss };
}
