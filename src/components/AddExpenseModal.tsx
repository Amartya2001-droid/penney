import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_META, DISCRETIONARY_CATEGORIES, ESSENTIAL_CATEGORIES } from '../constants/categories';
import { colors, radius, spacing } from '../constants/theme';
import { usePenneyStore } from '../store/usePenneyStore';
import type { Category, DateKey, Transaction } from '../types';
import { toDateKey } from '../utils/dates';
import { parseAmount } from '../utils/parseAmount';
import { Button } from './Button';
import { Chip } from './Chip';
import { DateStepper } from './DateStepper';
import { NumberField } from './NumberField';
import { SegmentedToggle, type SegmentOption } from './SegmentedToggle';

type ExpenseKind = 'discretionary' | 'essential';

const KIND_OPTIONS: readonly SegmentOption<ExpenseKind>[] = [
  { value: 'discretionary', label: 'Discretionary' },
  { value: 'essential', label: 'Essential' },
];

const KIND_HINT: Record<ExpenseKind, string> = {
  discretionary: "Counts toward Penney's mood and your savings pace.",
  essential: "Never hurts Penney's mood. Unbudgeted essentials adjust your daily target.",
};

const CATEGORIES_BY_KIND: Record<ExpenseKind, Category[]> = {
  discretionary: DISCRETIONARY_CATEGORIES,
  essential: ESSENTIAL_CATEGORIES,
};

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, the modal edits this expense instead of adding a new one. */
  editing?: Transaction | null;
  /** Called after the user deletes the expense being edited (e.g. to show an undo toast). */
  onDelete?: (transaction: Transaction) => void;
}

export function AddExpenseModal({ visible, onClose, editing = null, onDelete }: AddExpenseModalProps) {
  const insets = useSafeAreaInsets();
  const addTransaction = usePenneyStore((s) => s.addTransaction);
  const updateTransaction = usePenneyStore((s) => s.updateTransaction);

  const [amountText, setAmountText] = useState('');
  const [kind, setKind] = useState<ExpenseKind>('discretionary');
  const [category, setCategory] = useState<Category>(DISCRETIONARY_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<DateKey>(() => toDateKey(new Date()));
  const [error, setError] = useState<string | null>(null);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setAmountText(editing.amount.toFixed(2));
      setKind(editing.is_essential ? 'essential' : 'discretionary');
      setCategory(editing.category);
      setDescription(editing.description);
      setDate(editing.date);
    } else {
      setAmountText('');
      setKind('discretionary');
      setCategory(DISCRETIONARY_CATEGORIES[0]);
      setDescription('');
      setDate(toDateKey(new Date()));
    }
    setError(null);
  }, [visible, editing]);

  // Keep an unusual saved category (e.g. older data) visible and selectable while editing.
  const categoryOptions = CATEGORIES_BY_KIND[kind].includes(category)
    ? CATEGORIES_BY_KIND[kind]
    : [category, ...CATEGORIES_BY_KIND[kind]];

  const changeKind = (next: ExpenseKind) => {
    setKind(next);
    setCategory(CATEGORIES_BY_KIND[next][0]);
    setError(null);
  };

  const save = () => {
    const amount = parseAmount(amountText);
    if (amount === null) {
      setError('Enter an amount greater than $0, like 12.50.');
      return;
    }
    if (date > todayKey) {
      setError("Expenses can't be dated in the future.");
      return;
    }

    const input = { amount, category, is_essential: kind === 'essential', description, date };
    try {
      if (editing) updateTransaction(editing.id, input);
      else addTransaction(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this expense. Please try again.');
    }
  };

  const remove = () => {
    if (!editing || !onDelete) return;
    onDelete(editing);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>{editing ? 'Edit expense' : 'Add expense'}</Text>
              <Button label="Cancel" variant="ghost" onPress={onClose} />
            </View>

            <NumberField
              label="Amount"
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text);
                setError(null);
              }}
              autoFocus={!editing}
            />

            <View style={styles.group}>
              <Text style={styles.label}>Type</Text>
              <SegmentedToggle
                options={KIND_OPTIONS}
                value={kind}
                onChange={changeKind}
                accessibilityLabel="Expense type"
              />
              <Text style={styles.hint}>{KIND_HINT[kind]}</Text>
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chips}>
                {categoryOptions.map((c) => (
                  <Chip
                    key={c}
                    label={CATEGORY_META[c].label}
                    selected={c === category}
                    onPress={() => setCategory(c)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Date</Text>
              <DateStepper
                value={date}
                onChange={(next) => {
                  setDate(next);
                  setError(null);
                }}
                maxDate={todayKey}
              />
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Friday pizza"
                placeholderTextColor={colors.textMuted}
                maxLength={120}
                returnKeyType="done"
                accessibilityLabel="Note"
              />
            </View>

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Button label={editing ? 'Save changes' : 'Save expense'} onPress={save} />
            {editing && onDelete ? (
              <Button label="Delete expense" variant="ghost" onPress={remove} style={styles.delete} />
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  content: { padding: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  group: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 14 },
  delete: { marginTop: -spacing.sm },
});
