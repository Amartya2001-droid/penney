import { ALL_CATEGORIES, CATEGORY_META, FIXED_EXPENSE_KEYS } from '../constants/categories';
import { CategoryKind, type Category, type CategoryBudgets, type NewTransactionInput, type UserBudget } from '../types';
import { isValidDateKey } from './dates';

const MAX_DESCRIPTION_LENGTH = 120;

const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function validateBudget(budget: UserBudget): string[] {
  const errors: string[] = [];

  if (!isFiniteNumber(budget.monthly_income) || budget.monthly_income <= 0) {
    errors.push('Monthly income must be greater than 0.');
  }
  if (!isFiniteNumber(budget.savings_goal) || budget.savings_goal < 0) {
    errors.push('Savings goal must be 0 or more.');
  }
  for (const key of FIXED_EXPENSE_KEYS) {
    const value = budget.fixed_expenses?.[key];
    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`Fixed expense "${key}" must be 0 or more.`);
    }
  }

  if (errors.length === 0) {
    const fixedTotal = FIXED_EXPENSE_KEYS.reduce((s, k) => s + budget.fixed_expenses[k], 0);
    if (budget.savings_goal + fixedTotal > budget.monthly_income) {
      errors.push('Savings goal plus fixed expenses exceed monthly income.');
    }
  }

  return errors;
}

export function validateTransactionInput(input: NewTransactionInput): string[] {
  const errors: string[] = [];

  if (!isFiniteNumber(input.amount) || input.amount <= 0) {
    errors.push('Amount must be greater than 0.');
  }
  if (!ALL_CATEGORIES.includes(input.category)) {
    errors.push(`Unknown category: "${String(input.category)}".`);
  }
  if (input.date !== undefined && !isValidDateKey(input.date)) {
    errors.push('Date must be a valid YYYY-MM-DD date.');
  }
  if (input.description !== undefined && input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
  }

  return errors;
}

export function validateCategoryBudgets(budgets: CategoryBudgets): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(budgets)) {
    if (value === undefined) continue;
    const meta = CATEGORY_META[key as Category];
    if (!meta) {
      errors.push(`Unknown category: "${key}".`);
    } else if (meta.kind !== CategoryKind.Discretionary) {
      errors.push(`${meta.label} is an essential; limits are only for discretionary categories.`);
    } else if (!isFiniteNumber(value) || value < 0) {
      errors.push(`The ${meta.label.toLowerCase()} limit must be 0 or more.`);
    }
  }
  return errors;
}
