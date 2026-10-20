import { useMemo } from 'react';
import { getMonthSnapshot } from '../engine/snapshot';
import { usePenneyStore } from '../store/usePenneyStore';
import type { MonthSnapshot } from '../types';
import { dateFromKey, toDateKey } from '../utils/dates';

export function usePenneySnapshot(refDate?: Date): MonthSnapshot | null {
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const dateKey = toDateKey(refDate ?? new Date());

  return useMemo(
    () => (budget ? getMonthSnapshot(budget, transactions, dateFromKey(dateKey)) : null),
    [budget, transactions, dateKey],
  );
}
