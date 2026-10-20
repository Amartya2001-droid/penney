import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORY_META, DISCRETIONARY_CATEGORIES } from '../constants/categories';
import { radius, spacing } from '../constants/theme';
import { getFixedExpensesTotal } from '../engine/calculations';
import { usePenneyStore } from '../store/usePenneyStore';
import type { Category, CategoryBudgets, DateKey } from '../types';
import { spentInCategory } from '../utils/categoryBudgets';
import { formatCurrency } from '../utils/money';
import { parseAmount } from '../utils/parseAmount';
import { Button } from './Button';
import { NumberField } from './NumberField';
import { makeStyles } from '../theme/useTheme';

type FieldValues = Partial<Record<Category, string>>;

function valuesFrom(budgets: CategoryBudgets): FieldValues {
  const values: FieldValues = {};
  for (const c of DISCRETIONARY_CATEGORIES) {
    const limit = budgets[c];
    values[c] = limit === undefined ? '' : String(limit);
  }
  return values;
}

/** Blank means no limit; anything else must parse as 0 or more. Null if any field is invalid. */
function toBudgets(values: FieldValues): CategoryBudgets | null {
  const budgets: CategoryBudgets = {};
  for (const c of DISCRETIONARY_CATEGORIES) {
    const text = values[c]?.trim() ?? '';
    if (text === '') continue;
    const amount = parseAmount(text, { allowZero: true });
    if (amount === null) return null;
    budgets[c] = amount;
  }
  return budgets;
}

const sameBudgets = (a: CategoryBudgets | null, b: CategoryBudgets) =>
  a !== null && DISCRETIONARY_CATEGORIES.every((c) => a[c] === b[c]);

interface CategoryBudgetFormProps {
  todayKey: DateKey;
}

/** Settings editor for the optional monthly limits on discretionary categories. */
export function CategoryBudgetForm({ todayKey }: CategoryBudgetFormProps) {
  const styles = useStyles();
  const saved = usePenneyStore((s) => s.categoryBudgets);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const setCategoryBudgets = usePenneyStore((s) => s.setCategoryBudgets);

  const [values, setValues] = useState<FieldValues>(() => valuesFrom(saved));
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const parsed = useMemo(() => toBudgets(values), [values]);
  const isDirty = !sameBudgets(parsed, saved);
  const total = parsed ? Object.values(parsed).reduce<number>((s, v) => s + (v ?? 0), 0) : 0;
  const discretionaryBudget = budget
    ? Math.max(0, budget.monthly_income - budget.savings_goal - getFixedExpensesTotal(budget.fixed_expenses))
    : null;

  const update = (category: Category) => (text: string) => {
    setValues((prev) => ({ ...prev, [category]: text }));
    setError(null);
    setJustSaved(false);
  };

  const save = () => {
    if (!parsed) {
      setError('Limits must be amounts of 0 or more. Leave a field blank for no limit.');
      return;
    }
    try {
      setCategoryBudgets(parsed);
      setJustSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your limits. Please try again.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {DISCRETIONARY_CATEGORIES.map((c) => (
          <NumberField
            key={c}
            label={CATEGORY_META[c].label}
            value={values[c] ?? ''}
            onChangeText={update(c)}
            placeholder="No limit"
            hint={`Spent this month: ${formatCurrency(spentInCategory(transactions, c, todayKey))}`}
          />
        ))}
      </View>

      {parsed && total > 0 && discretionaryBudget !== null ? (
        <View style={styles.preview}>
          <Text style={[styles.previewText, total > discretionaryBudget && styles.previewWarning]}>
            {total > discretionaryBudget
              ? `These limits add up to ${formatCurrency(total)}, more than your ${formatCurrency(discretionaryBudget)} discretionary budget. Penney's mood still follows the overall budget.`
              : `These limits add up to ${formatCurrency(total)} of your ${formatCurrency(discretionaryBudget)} discretionary budget.`}
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {justSaved && !isDirty ? <Text style={styles.saved}>Limits saved.</Text> : null}

      <Button label="Save limits" onPress={save} disabled={!isDirty} />
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: spacing.lg },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    preview: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
    previewText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    previewWarning: { color: colors.warning },
    error: { color: colors.danger, fontSize: 14 },
    saved: { color: colors.success, fontSize: 14, fontWeight: '600' },
  }),
);
