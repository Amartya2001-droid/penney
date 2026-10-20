import { Category, CategoryKind, type FixedExpenseKey } from '../types';

export interface CategoryMeta {
  label: string;
  kind: CategoryKind;
  /** Which fixed budget this category draws from; null means it isn't pre-budgeted. */
  fixedKey: FixedExpenseKey | null;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  [Category.Rent]: { label: 'Rent', kind: CategoryKind.Essential, fixedKey: 'rent' },
  [Category.Utilities]: { label: 'Utilities', kind: CategoryKind.Essential, fixedKey: 'utilities' },
  [Category.Insurance]: { label: 'Insurance', kind: CategoryKind.Essential, fixedKey: 'insurance' },
  [Category.Groceries]: { label: 'Groceries', kind: CategoryKind.Essential, fixedKey: 'groceries' },
  [Category.EmergencyRepair]: { label: 'Emergency repair', kind: CategoryKind.Essential, fixedKey: null },
  [Category.Takeout]: { label: 'Takeout', kind: CategoryKind.Discretionary, fixedKey: null },
  [Category.Amazon]: { label: 'Amazon', kind: CategoryKind.Discretionary, fixedKey: null },
  [Category.Shopping]: { label: 'Shopping', kind: CategoryKind.Discretionary, fixedKey: null },
  [Category.Entertainment]: { label: 'Entertainment', kind: CategoryKind.Discretionary, fixedKey: null },
};

export const ALL_CATEGORIES = Object.values(Category) as Category[];

export const ESSENTIAL_CATEGORIES = ALL_CATEGORIES.filter(
  (c) => CATEGORY_META[c].kind === CategoryKind.Essential,
);

export const DISCRETIONARY_CATEGORIES = ALL_CATEGORIES.filter(
  (c) => CATEGORY_META[c].kind === CategoryKind.Discretionary,
);

export const FIXED_EXPENSE_KEYS: readonly FixedExpenseKey[] = [
  'rent',
  'utilities',
  'insurance',
  'groceries',
];

export function isEssentialCategory(category: Category): boolean {
  return CATEGORY_META[category].kind === CategoryKind.Essential;
}
