import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddExpenseModal } from '../src/components/AddExpenseModal';
import { Button } from '../src/components/Button';
import { EmptyState } from '../src/components/EmptyState';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { MonthSummaryCard } from '../src/components/MonthSummaryCard';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SegmentedToggle, type SegmentOption } from '../src/components/SegmentedToggle';
import { TransactionRow } from '../src/components/TransactionRow';
import { UndoToast } from '../src/components/UndoToast';
import { CATEGORY_META } from '../src/constants/categories';
import { colors, radius, spacing } from '../src/constants/theme';
import { getFixedExpensesTotal } from '../src/engine/calculations';
import { useTodayKey } from '../src/hooks/useTodayKey';
import { useUndoableDelete } from '../src/hooks/useUndoableDelete';
import { usePenneyStore } from '../src/store/usePenneyStore';
import type { Transaction } from '../src/types';
import { daysBetween, monthKeyOf } from '../src/utils/dates';
import { formatLongDate } from '../src/utils/formatDate';
import { formatMonthLabel, shiftMonthKey, summarizeMonth, type MonthKey } from '../src/utils/monthSummary';
import { formatCurrency } from '../src/utils/money';

type Filter = 'all' | 'discretionary' | 'essential';

const FILTER_OPTIONS: readonly SegmentOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'discretionary', label: 'Discretionary' },
  { value: 'essential', label: 'Essential' },
];

type ModalState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; transaction: Transaction };

function dayHeading(dateKey: string, todayKey: string): string {
  const diff = daysBetween(dateKey, todayKey);
  if (diff === 0) return `Today · ${formatLongDate(dateKey)}`;
  if (diff === 1) return `Yesterday · ${formatLongDate(dateKey)}`;
  return formatLongDate(dateKey);
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const todayKey = useTodayKey();
  const thisMonth = monthKeyOf(todayKey);

  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const { deleteTransaction, lastDeleted, undo, dismiss } = useUndoableDelete();

  const [monthKey, setMonthKey] = useState<MonthKey>(thisMonth);
  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });

  const summary = useMemo(() => summarizeMonth(transactions, monthKey), [transactions, monthKey]);
  const oldestMonth = useMemo(
    () => (transactions.length > 0 ? monthKeyOf(transactions[transactions.length - 1].date) : thisMonth),
    [transactions, thisMonth],
  );

  const sections = useMemo(
    () =>
      summary.days
        .map((day) => {
          const data = day.transactions.filter((t) =>
            filter === 'all' ? true : filter === 'essential' ? t.is_essential : !t.is_essential,
          );
          return { date: day.date, total: data.reduce((s, t) => s + t.amount, 0), data };
        })
        .filter((section) => section.data.length > 0),
    [summary, filter],
  );

  if (!hasHydrated) return <LoadingScreen />;
  if (!budget) return <Redirect href="/onboarding" />;

  const discretionaryBudget = Math.max(
    0,
    budget.monthly_income - budget.savings_goal - getFixedExpensesTotal(budget.fixed_expenses),
  );
  const canGoNext = monthKey < thisMonth;
  const canGoPrev = monthKey > oldestMonth;
  const isCurrentMonth = monthKey === thisMonth;

  const header = (
    <View style={styles.headerBlock}>
      <ScreenHeader
        title="History"
        right={<Button label="+ Add" variant="secondary" onPress={() => setModal({ mode: 'add' })} />}
      />

      <View style={styles.monthRow}>
        <MonthButton label="‹" accessibilityLabel="Previous month" disabled={!canGoPrev} onPress={() => setMonthKey(shiftMonthKey(monthKey, -1))} />
        <Text style={styles.monthLabel} accessibilityLiveRegion="polite">
          {formatMonthLabel(monthKey)}
        </Text>
        <MonthButton label="›" accessibilityLabel="Next month" disabled={!canGoNext} onPress={() => setMonthKey(shiftMonthKey(monthKey, 1))} />
      </View>

      {summary.count > 0 ? (
        <>
          <MonthSummaryCard summary={summary} discretionaryBudget={discretionaryBudget} />
          <SegmentedToggle options={FILTER_OPTIONS} value={filter} onChange={setFilter} accessibilityLabel="Filter expenses" />
        </>
      ) : null}
    </View>
  );

  const empty =
    summary.count === 0 ? (
      <EmptyState
        title={isCurrentMonth ? 'No expenses yet this month' : `Nothing logged in ${formatMonthLabel(monthKey)}`}
        message={
          isCurrentMonth
            ? 'Anything you log shows up here, grouped by day. Tap an expense later to edit it.'
            : 'Use the arrows to look at another month.'
        }
        actionLabel={isCurrentMonth ? 'Add an expense' : undefined}
        onAction={isCurrentMonth ? () => setModal({ mode: 'add' }) : undefined}
      />
    ) : (
      <EmptyState
        title={`No ${filter} expenses`}
        message={`Nothing ${filter} was logged in ${formatMonthLabel(monthKey)}.`}
        actionLabel="Show all"
        onAction={() => setFilter('all')}
        showPenney={false}
      />
    );

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 96 },
        ]}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{dayHeading(section.date, todayKey)}</Text>
            <Text style={styles.dayTotal}>{formatCurrency(section.total)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            showDate={false}
            onPress={() => setModal({ mode: 'edit', transaction: item })}
            onRemove={() => deleteTransaction(item)}
          />
        )}
      />

      <UndoToast
        toastKey={lastDeleted?.id ?? null}
        message={
          lastDeleted
            ? `Deleted ${formatCurrency(lastDeleted.amount)} ${CATEGORY_META[lastDeleted.category].label.toLowerCase()}.`
            : ''
        }
        onUndo={undo}
        onDismiss={dismiss}
        bottomOffset={insets.bottom + spacing.lg}
      />

      <AddExpenseModal
        visible={modal.mode !== 'closed'}
        editing={modal.mode === 'edit' ? modal.transaction : null}
        onDelete={deleteTransaction}
        onClose={() => setModal({ mode: 'closed' })}
      />
    </View>
  );
}

interface MonthButtonProps {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

function MonthButton({ label, accessibilityLabel, disabled, onPress }: MonthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.monthButton, pressed && styles.monthPressed, disabled && styles.monthDisabled]}
    >
      <Text style={styles.monthArrow}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  headerBlock: { gap: spacing.lg, marginBottom: spacing.lg },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  monthLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  monthPressed: { backgroundColor: colors.surfaceMuted },
  monthDisabled: { opacity: 0.3 },
  monthArrow: { fontSize: 24, color: colors.text, lineHeight: 28 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  dayTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  dayTotal: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
});
