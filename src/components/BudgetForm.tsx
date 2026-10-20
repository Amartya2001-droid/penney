import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { getFixedExpensesTotal } from '../engine/calculations';
import { usePenneyStore } from '../store/usePenneyStore';
import type { UserBudget } from '../types';
import { getDaysInMonth } from '../utils/dates';
import { formatCurrency } from '../utils/money';
import { parseAmount } from '../utils/parseAmount';
import { Button } from './Button';
import { NumberField } from './NumberField';

type FieldKey = 'income' | 'savings' | 'rent' | 'utilities' | 'insurance' | 'groceries';
type FieldValues = Record<FieldKey, string>;

const FIXED_FIELDS: { key: Exclude<FieldKey, 'income' | 'savings'>; label: string }[] = [
  { key: 'rent', label: 'Rent' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'groceries', label: 'Groceries' },
];

function valuesFromBudget(budget: UserBudget | null): FieldValues {
  if (!budget) {
    return { income: '', savings: '', rent: '', utilities: '', insurance: '', groceries: '' };
  }
  return {
    income: String(budget.monthly_income),
    savings: String(budget.savings_goal),
    rent: String(budget.fixed_expenses.rent),
    utilities: String(budget.fixed_expenses.utilities),
    insurance: String(budget.fixed_expenses.insurance),
    groceries: String(budget.fixed_expenses.groceries),
  };
}

/** Empty fixed-expense fields count as 0. */
function parseFixed(text: string): number | null {
  return text.trim() === '' ? 0 : parseAmount(text, { allowZero: true });
}

function toBudget(values: FieldValues): UserBudget | null {
  const income = parseAmount(values.income);
  const savings = values.savings.trim() === '' ? 0 : parseAmount(values.savings, { allowZero: true });
  const rent = parseFixed(values.rent);
  const utilities = parseFixed(values.utilities);
  const insurance = parseFixed(values.insurance);
  const groceries = parseFixed(values.groceries);

  if (
    income === null ||
    savings === null ||
    rent === null ||
    utilities === null ||
    insurance === null ||
    groceries === null
  ) {
    return null;
  }

  return {
    monthly_income: income,
    savings_goal: savings,
    fixed_expenses: { rent, utilities, insurance, groceries },
  };
}

function sameBudget(a: UserBudget | null, b: UserBudget | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface BudgetFormProps {
  initialBudget: UserBudget | null;
  submitLabel: string;
  /** Called after the budget passes validation and is saved. */
  onSaved?: (budget: UserBudget) => void;
}

/** Income, savings goal, and fixed essentials, with a live discretionary preview. */
export function BudgetForm({ initialBudget, submitLabel, onSaved }: BudgetFormProps) {
  const setBudget = usePenneyStore((s) => s.setBudget);
  const [values, setValues] = useState<FieldValues>(() => valuesFromBudget(initialBudget));
  const [savedBudget, setSavedBudget] = useState<UserBudget | null>(initialBudget);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const update = (key: FieldKey) => (text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
    setError(null);
    setJustSaved(false);
  };

  const parsed = useMemo(() => toBudget(values), [values]);
  const preview = useMemo(() => {
    if (!parsed) return null;
    const now = new Date();
    const discretionary =
      parsed.monthly_income - parsed.savings_goal - getFixedExpensesTotal(parsed.fixed_expenses);
    return {
      discretionary,
      perDay: discretionary / getDaysInMonth(now.getFullYear(), now.getMonth() + 1),
    };
  }, [parsed]);

  const isDirty = !sameBudget(parsed, savedBudget);

  const save = () => {
    if (!parsed) {
      setError('Enter a monthly income above $0, and amounts of 0 or more everywhere else.');
      return;
    }
    try {
      setBudget(parsed);
      setSavedBudget(parsed);
      setJustSaved(true);
      onSaved?.(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your budget. Please try again.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <NumberField label="Monthly net income" value={values.income} onChangeText={update('income')} />
        <NumberField
          label="Monthly savings goal"
          value={values.savings}
          onChangeText={update('savings')}
          hint="What you want left over at the end of the month."
        />
      </View>

      <Text style={styles.sectionTitle}>Fixed essentials</Text>
      <View style={styles.card}>
        {FIXED_FIELDS.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            value={values[field.key]}
            onChangeText={update(field.key)}
          />
        ))}
      </View>

      {preview ? (
        <View style={styles.preview}>
          {preview.discretionary >= 0 ? (
            <Text style={styles.previewText}>
              Discretionary budget: {formatCurrency(preview.discretionary)}/month, about{' '}
              {formatCurrency(preview.perDay)}/day.
            </Text>
          ) : (
            <Text style={[styles.previewText, styles.previewWarning]}>
              Your savings goal and essentials exceed your income by{' '}
              {formatCurrency(Math.abs(preview.discretionary))}. Lower the goal or an expense to continue.
            </Text>
          )}
        </View>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {justSaved && !isDirty ? <Text style={styles.saved}>Budget saved.</Text> : null}

      <Button label={submitLabel} onPress={save} disabled={!isDirty && savedBudget !== null} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
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
  previewWarning: { color: colors.danger },
  error: { color: colors.danger, fontSize: 14 },
  saved: { color: colors.success, fontSize: 14, fontWeight: '600' },
});
