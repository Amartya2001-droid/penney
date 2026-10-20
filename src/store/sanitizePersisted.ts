import { ALL_CATEGORIES, DISCRETIONARY_CATEGORIES, FIXED_EXPENSE_KEYS } from '../constants/categories';
import type { AppearancePreference } from '../constants/theme';
import { isAppearancePreference } from '../theme/resolveScheme';
import {
  MoodState,
  type Category,
  type CategoryBudgets,
  type PenneyCommentary,
  type Transaction,
  type UserBudget,
} from '../types';
import { isValidDateKey } from '../utils/dates';

export interface PersistedPenneyData {
  budget: UserBudget | null;
  transactions: Transaction[];
  commentaryLog: PenneyCommentary[];
  appearance: AppearancePreference;
  categoryBudgets: CategoryBudgets;
}

export interface SanitizeResult {
  data: PersistedPenneyData;
  /** Count of saved records that couldn't be read and were skipped. */
  droppedRecords: number;
}

const MOODS = Object.values(MoodState) as string[];

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function readBudget(raw: unknown): UserBudget | null {
  if (!isObject(raw) || !isObject(raw.fixed_expenses)) return null;
  const fixed = raw.fixed_expenses;
  if (!isNonNegative(raw.monthly_income) || raw.monthly_income <= 0) return null;
  if (!isNonNegative(raw.savings_goal)) return null;
  if (!FIXED_EXPENSE_KEYS.every((k) => isNonNegative(fixed[k]))) return null;

  return {
    monthly_income: raw.monthly_income,
    savings_goal: raw.savings_goal,
    fixed_expenses: {
      rent: fixed.rent as number,
      utilities: fixed.utilities as number,
      insurance: fixed.insurance as number,
      groceries: fixed.groceries as number,
    },
  };
}

function readTransaction(raw: unknown): Transaction | null {
  if (!isObject(raw)) return null;
  const { id, amount, category, date, is_essential, description, created_at } = raw;
  if (typeof id !== 'string' || id === '') return null;
  if (!isNonNegative(amount) || amount === 0) return null;
  if (typeof category !== 'string' || !ALL_CATEGORIES.includes(category as Category)) return null;
  if (typeof date !== 'string' || !isValidDateKey(date)) return null;
  if (typeof is_essential !== 'boolean') return null;

  return {
    id,
    amount,
    category: category as Category,
    date,
    is_essential,
    description: typeof description === 'string' ? description : '',
    created_at: typeof created_at === 'string' ? created_at : `${date}T12:00:00.000Z`,
  };
}

function readCommentary(raw: unknown): PenneyCommentary | null {
  if (!isObject(raw)) return null;
  const { id, date_key, mood, message, source, generated_at } = raw;
  if (typeof id !== 'string' || typeof message !== 'string' || message.trim() === '') return null;
  if (typeof date_key !== 'string' || !isValidDateKey(date_key)) return null;
  if (typeof mood !== 'string' || !MOODS.includes(mood)) return null;
  if (source !== 'ai' && source !== 'fallback') return null;

  return {
    id,
    date_key,
    mood: mood as MoodState,
    message,
    source,
    generated_at: typeof generated_at === 'string' ? generated_at : new Date(0).toISOString(),
  };
}

/**
 * Validates data loaded from storage. Unreadable records are skipped (and counted) instead of
 * crashing the app; duplicate transaction IDs keep their first occurrence.
 */
export function sanitizePersistedState(raw: unknown): SanitizeResult {
  if (!isObject(raw)) {
    return {
      data: { budget: null, transactions: [], commentaryLog: [], appearance: 'system', categoryBudgets: {} },
      droppedRecords: 0,
    };
  }

  let droppedRecords = 0;

  const budget = raw.budget == null ? null : readBudget(raw.budget);
  if (raw.budget != null && budget === null) droppedRecords++;

  const transactions: Transaction[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(raw.transactions) ? raw.transactions : []) {
    const t = readTransaction(item);
    if (!t || seen.has(t.id)) {
      droppedRecords++;
      continue;
    }
    seen.add(t.id);
    transactions.push(t);
  }

  const commentaryLog: PenneyCommentary[] = [];
  for (const item of Array.isArray(raw.commentaryLog) ? raw.commentaryLog : []) {
    const c = readCommentary(item);
    if (c) commentaryLog.push(c);
    // Quotes are regenerable, so a bad one is dropped without counting as lost data.
  }

  // A missing or unknown appearance (older saves) quietly falls back to following the device.
  const appearance = isAppearancePreference(raw.appearance) ? raw.appearance : 'system';

  // Older saves have no limits. Unusable entries are skipped and counted, like other records.
  const categoryBudgets: CategoryBudgets = {};
  if (isObject(raw.categoryBudgets)) {
    for (const [key, value] of Object.entries(raw.categoryBudgets)) {
      if (DISCRETIONARY_CATEGORIES.includes(key as Category) && isNonNegative(value)) {
        categoryBudgets[key as Category] = value;
      } else {
        droppedRecords++;
      }
    }
  }

  return { data: { budget, transactions, commentaryLog, appearance, categoryBudgets }, droppedRecords };
}
