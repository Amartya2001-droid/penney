import { CATEGORY_META } from '../constants/categories';
import type { Category, Transaction } from '../types';
import { monthKeyOf } from './dates';

export interface TransactionFilter {
  /** null searches every month. */
  month: string | null;
  kind: 'all' | 'essential' | 'discretionary';
  category: Category | null;
  query: string;
}

/** Every whitespace-separated term must match the purchase's note, category, date or amount. */
export function filterTransactions(transactions: Transaction[], filter: TransactionFilter): Transaction[] {
  const terms = filter.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return transactions.filter((t) => {
    if (filter.month && monthKeyOf(t.date) !== filter.month) return false;
    if (filter.kind !== 'all' && t.is_essential !== (filter.kind === 'essential')) return false;
    if (filter.category && t.category !== filter.category) return false;
    const searchable = `${t.description} ${CATEGORY_META[t.category].label} ${t.date} ${t.amount.toFixed(2)}`.toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

/** RFC 4180 fields, with spreadsheet formula injection protection for user-controlled notes. */
const cell = (value: string) => {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = [['Date', 'Category', 'Type', 'Amount (CAD)', 'Note'], ...transactions.map((t) => [
    t.date, CATEGORY_META[t.category].label, t.is_essential ? 'Essential' : 'Discretionary',
    t.amount.toFixed(2), t.description,
  ])];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
