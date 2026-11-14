import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddExpenseModal } from '../src/components/AddExpenseModal';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { NoticeBanner } from '../src/components/NoticeBanner';
import { EmptyState } from '../src/components/EmptyState';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { MonthSummaryCard } from '../src/components/MonthSummaryCard';
import { PeriodSwitcher } from '../src/components/PeriodSwitcher';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SegmentedToggle, type SegmentOption } from '../src/components/SegmentedToggle';
import { TransactionRow } from '../src/components/TransactionRow';
import { UndoToast } from '../src/components/UndoToast';
import { ALL_CATEGORIES, CATEGORY_META } from '../src/constants/categories';
import { radius, spacing } from '../src/constants/theme';
import { getFixedExpensesTotal } from '../src/engine/calculations';
import { useTodayKey } from '../src/hooks/useTodayKey';
import { useUndoableDelete } from '../src/hooks/useUndoableDelete';
import { usePenneyStore } from '../src/store/usePenneyStore';
import type { Category, Transaction } from '../src/types';
import { daysBetween, monthKeyOf } from '../src/utils/dates';
import { formatLongDate } from '../src/utils/formatDate';
import { formatMonthLabel, shiftMonthKey, summarizeMonth, type MonthKey } from '../src/utils/monthSummary';
import { formatCurrency } from '../src/utils/money';
import { downloadFile } from '../src/utils/downloadFile';
import { filterTransactions, transactionsToCsv } from '../src/utils/transactionSearch';
import { makeStyles, useTheme } from '../src/theme/useTheme';

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
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const todayKey = useTodayKey();
  const thisMonth = monthKeyOf(todayKey);

  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const { deleteTransaction, lastDeleted, undo, dismiss } = useUndoableDelete();

  const [monthKey, setMonthKey] = useState<MonthKey>(thisMonth);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [category, setCategory] = useState<Category | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });

  const summary = useMemo(() => summarizeMonth(transactions, monthKey), [transactions, monthKey]);
  const oldestMonth = useMemo(
    () => (transactions.length > 0 ? monthKeyOf(transactions[transactions.length - 1].date) : thisMonth),
    [transactions, thisMonth],
  );

  const matching = useMemo(() => filterTransactions(transactions, {
    month: scope === 'month' ? monthKey : null, kind: filter, category, query,
  }), [transactions, scope, monthKey, filter, category, query]);
  const sections = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of matching) {
      const day = groups.get(t.date) ?? [];
      day.push(t);
      groups.set(t.date, day);
    }
    return [...groups].sort(([a], [b]) => b.localeCompare(a)).map(([date, data]) => ({
      date, data, total: data.reduce((sum, t) => sum + t.amount, 0),
    }));
  }, [matching]);
  const matchingTotal = matching.reduce((sum, t) => sum + t.amount, 0);
  const hasFilters = query.trim() !== '' || category !== null || filter !== 'all';
  const clearFilters = () => { setQuery(''); setCategory(null); setFilter('all'); };
  const exportCsv = () => {
    try {
      downloadFile(transactionsToCsv(matching), `penney-expenses-${scope === 'all' ? 'all-months' : monthKey}.csv`, 'text/csv;charset=utf-8');
      setExportError(null);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not download expenses. Please try again.');
    }
  };

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

      <SegmentedToggle options={[{ value: 'month', label: 'Selected month' }, { value: 'all', label: 'All months' }]} value={scope} onChange={setScope} accessibilityLabel="History period" />
      {scope === 'month' ? <PeriodSwitcher
        label={formatMonthLabel(monthKey)}
        previousLabel="Previous month"
        nextLabel="Next month"
        canGoPrevious={canGoPrev}
        canGoNext={canGoNext}
        onPrevious={() => setMonthKey(shiftMonthKey(monthKey, -1))}
        onNext={() => setMonthKey(shiftMonthKey(monthKey, 1))}
      /> : null}

      {scope === 'month' && summary.count > 0 ? (
        <>
          <MonthSummaryCard summary={summary} discretionaryBudget={discretionaryBudget} />
        </>
      ) : null}
      <TextInput
        accessibilityLabel="Search expenses"
        placeholder="Search expenses"
        placeholderTextColor={colors.textMuted}
        value={query} onChangeText={setQuery} style={styles.search}
        autoCorrect={false} returnKeyType="search"
      />
      <SegmentedToggle options={FILTER_OPTIONS} value={filter} onChange={setFilter} accessibilityLabel="Filter expenses" />
      <View style={styles.categories}>
        <Chip label="All categories" selected={category === null} onPress={() => setCategory(null)} />
        {ALL_CATEGORIES.map((c) => <Chip key={c} label={CATEGORY_META[c].label} selected={category === c} onPress={() => setCategory(c)} />)}
      </View>
      <Text style={styles.results} accessibilityLiveRegion="polite">
        {matching.length} {matching.length === 1 ? 'expense' : 'expenses'} · {formatCurrency(matchingTotal)}
      </Text>
      {hasFilters ? <Button label="Clear filters" variant="ghost" onPress={clearFilters} /> : null}
      {Platform.OS === 'web' ? <>
        <Button label="Download results as CSV" variant="secondary" disabled={matching.length === 0} onPress={exportCsv} />
        <Text style={styles.hint}>Exports the expenses shown below in CAD. For a restorable backup, use Settings → Export backup.</Text>
      </> : null}
      {exportError ? <NoticeBanner tone="danger" message={exportError} onDismiss={() => setExportError(null)} /> : null}
    </View>
  );

  const empty =
    !hasFilters && (scope === 'all' ? transactions.length === 0 : summary.count === 0) ? (
      <EmptyState
        title={scope === 'all' ? 'No expenses yet' : isCurrentMonth ? 'No expenses yet this month' : `Nothing logged in ${formatMonthLabel(monthKey)}`}
        message={
          scope === 'all' || isCurrentMonth
            ? 'Anything you log shows up here, grouped by day. Tap an expense later to edit it.'
            : 'Use the arrows to look at another month.'
        }
        actionLabel={scope === 'all' || isCurrentMonth ? 'Add an expense' : undefined}
        onAction={scope === 'all' || isCurrentMonth ? () => setModal({ mode: 'add' }) : undefined}
      />
    ) : (
      <EmptyState
        title="No matching expenses"
        message="Try another search, clear your filters, or choose All months."
        actionLabel="Clear filters"
        onAction={clearFilters}
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

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.xl,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    search: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    results: { color: colors.text, fontSize: 16, fontWeight: '600' },
    hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
    headerBlock: { gap: spacing.lg, marginBottom: spacing.lg },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingTop: spacing.lg,
      paddingBottom: spacing.xs,
    },
    dayTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    dayTotal: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  }),
);
