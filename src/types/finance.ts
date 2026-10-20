/** Local calendar date formatted as YYYY-MM-DD (no time, no timezone). */
export type DateKey = string;

export enum Category {
  Rent = 'rent',
  Utilities = 'utilities',
  Insurance = 'insurance',
  Groceries = 'groceries',
  EmergencyRepair = 'emergency_repair',
  Takeout = 'takeout',
  Amazon = 'amazon',
  Shopping = 'shopping',
  Entertainment = 'entertainment',
}

export enum CategoryKind {
  Essential = 'essential',
  Discretionary = 'discretionary',
}

/** Fixed monthly essentials the user budgets up front. */
export type FixedExpenseKey = 'rent' | 'utilities' | 'insurance' | 'groceries';

export type FixedExpenses = Record<FixedExpenseKey, number>;

export interface UserBudget {
  /** Monthly net (take-home) income. */
  monthly_income: number;
  /** Amount the user wants to save this month. */
  savings_goal: number;
  /** Budgeted essential fixed expenses for the month. */
  fixed_expenses: FixedExpenses;
}

export interface Transaction {
  id: string;
  /** Positive amount in major currency units (e.g. 12.5 = $12.50). */
  amount: number;
  category: Category;
  /** Local date the money was spent. */
  date: DateKey;
  /** Essential spend never hurts Penney's mood; discretionary spend does. */
  is_essential: boolean;
  description: string;
  /** ISO timestamp of when the entry was logged; used to order same-day entries. */
  created_at: string;
}

/** Input accepted by the store's addTransaction(); the store fills in the rest. */
export interface NewTransactionInput {
  amount: number;
  category: Category;
  /** Defaults to today. */
  date?: DateKey;
  /** Defaults to the category's kind (e.g. Takeout → false). */
  is_essential?: boolean;
  description?: string;
}
