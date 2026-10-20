import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddExpenseModal } from '../src/components/AddExpenseModal';
import { Button } from '../src/components/Button';
import { CategoryBudgetsCard } from '../src/components/CategoryBudgetsCard';
import { EmptyState } from '../src/components/EmptyState';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { NoticeBanner } from '../src/components/NoticeBanner';
import { PaceProgressBar } from '../src/components/PaceProgressBar';
import { PenneyCharacter } from '../src/components/PenneyCharacter';
import { PenneyQuoteBox } from '../src/components/PenneyQuoteBox';
import { StreakCard } from '../src/components/StreakCard';
import { SummaryStats } from '../src/components/SummaryStats';
import { TransactionRow } from '../src/components/TransactionRow';
import { UndoToast } from '../src/components/UndoToast';
import { WeekGlance } from '../src/components/WeekGlance';
import { CATEGORY_META } from '../src/constants/categories';
import { MOOD_VISUALS } from '../src/constants/moods';
import { spacing } from '../src/constants/theme';
import { getMonthToDateTransactions } from '../src/engine/calculations';
import { useDailyCommentary } from '../src/hooks/useDailyCommentary';
import { usePenneySnapshot } from '../src/hooks/usePenneySnapshot';
import { useTodayKey } from '../src/hooks/useTodayKey';
import { useUndoableDelete } from '../src/hooks/useUndoableDelete';
import { useIntentStore } from '../src/store/useIntentStore';
import { usePenneyStore } from '../src/store/usePenneyStore';
import type { Transaction } from '../src/types';
import { summarizeCategoryBudgets } from '../src/utils/categoryBudgets';
import { dateFromKey } from '../src/utils/dates';
import { formatLongDate } from '../src/utils/formatDate';
import { formatCurrency } from '../src/utils/money';
import { summarizeStreaks } from '../src/utils/streaks';
import { startOfWeek, summarizeWeek } from '../src/utils/weekSummary';
import { makeStyles, useTheme } from '../src/theme/useTheme';

const RECENT_COUNT = 5;
const FAB_AREA_HEIGHT = 86;

type ModalState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; transaction: Transaction };

export default function DashboardScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const todayKey = useTodayKey();
  const refDate = useMemo(() => dateFromKey(todayKey), [todayKey]);

  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const categoryBudgets = usePenneyStore((s) => s.categoryBudgets);
  const storageWarning = usePenneyStore((s) => s.storageWarning);
  const dismissStorageWarning = usePenneyStore((s) => s.dismissStorageWarning);
  const snapshot = usePenneySnapshot(refDate);
  const commentary = useDailyCommentary(snapshot);
  const { deleteTransaction, lastDeleted, undo, dismiss } = useUndoableDelete();
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
  const addExpenseRequested = useIntentStore((s) => s.addExpenseRequested);
  const consumeAddExpense = useIntentStore((s) => s.consumeAddExpense);

  // A tapped reminder asks for Add Expense: open it once the data has loaded.
  useEffect(() => {
    if (!addExpenseRequested || !hasHydrated || !budget) return;
    setModal({ mode: 'add' });
    consumeAddExpense();
  }, [addExpenseRequested, hasHydrated, budget, consumeAddExpense]);

  const monthTransactions = useMemo(
    () => getMonthToDateTransactions(transactions, refDate),
    [transactions, refDate],
  );
  const week = useMemo(
    () => (budget ? summarizeWeek(transactions, budget, startOfWeek(todayKey), todayKey) : null),
    [transactions, budget, todayKey],
  );
  const streak = useMemo(
    () => (budget ? summarizeStreaks(transactions, budget, todayKey) : null),
    [transactions, budget, todayKey],
  );
  const categoryLimits = useMemo(
    () => summarizeCategoryBudgets(transactions, categoryBudgets, todayKey),
    [transactions, categoryBudgets, todayKey],
  );

  if (!hasHydrated) return <LoadingScreen />;
  if (!budget || !snapshot) return <Redirect href="/onboarding" />;

  const moodVisual = MOOD_VISUALS[snapshot.mood];
  const recent = monthTransactions.slice(0, RECENT_COUNT);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + FAB_AREA_HEIGHT + spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.appName} accessibilityRole="header">
              Penney
            </Text>
            <Text style={styles.date}>{formatLongDate(snapshot.dateKey)}</Text>
          </View>
          <View style={styles.headerActions}>
            <Button label="History" variant="secondary" onPress={() => router.push('/transactions')} />
            <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
          </View>
        </View>

        {storageWarning ? (
          <NoticeBanner tone="warning" message={storageWarning} onDismiss={dismissStorageWarning} />
        ) : null}

        <View style={styles.hero}>
          <PenneyCharacter mood={snapshot.mood} />
          <Text style={[styles.moodLabel, { color: colors[moodVisual.tone] }]}>{moodVisual.label}</Text>
          <Text style={styles.moodCaption}>{moodVisual.caption}</Text>
        </View>

        <PenneyQuoteBox commentary={commentary} />
        <PaceProgressBar snapshot={snapshot} />
        <SummaryStats snapshot={snapshot} />
        {week ? <WeekGlance summary={week} onPress={() => router.push('/week')} /> : null}
        {streak ? <StreakCard streak={streak} todayKey={todayKey} /> : null}
        <CategoryBudgetsCard summary={categoryLimits} onEdit={() => router.push('/settings')} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent expenses</Text>
            {monthTransactions.length > 0 ? (
              <Text style={styles.sectionMeta}>{monthTransactions.length} this month</Text>
            ) : null}
          </View>

          {recent.length === 0 ? (
            <EmptyState
              title="Nothing logged this month"
              message="Penney is watching, supportively. Log a purchase and he'll have something to say."
              actionLabel="Add your first expense"
              onAction={() => setModal({ mode: 'add' })}
              showPenney={false}
            />
          ) : (
            recent.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onPress={() => setModal({ mode: 'edit', transaction: t })}
                onRemove={() => deleteTransaction(t)}
              />
            ))
          )}

          {monthTransactions.length > RECENT_COUNT ? (
            <Button
              label={`See all ${monthTransactions.length} this month`}
              variant="ghost"
              onPress={() => router.push('/transactions')}
            />
          ) : null}
        </View>
      </ScrollView>

      <UndoToast
        toastKey={lastDeleted?.id ?? null}
        message={
          lastDeleted
            ? `Deleted ${formatCurrency(lastDeleted.amount)} ${CATEGORY_META[lastDeleted.category].label.toLowerCase()}.`
            : ''
        }
        onUndo={undo}
        onDismiss={dismiss}
        bottomOffset={insets.bottom + FAB_AREA_HEIGHT}
      />

      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button label="+ Add Expense" onPress={() => setModal({ mode: 'add' })} style={styles.fab} />
      </View>

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
      gap: spacing.lg,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    headerText: { flexShrink: 1 },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    appName: { fontSize: 28, fontWeight: '800', color: colors.text },
    date: { fontSize: 14, color: colors.textMuted },
    hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
    moodLabel: { fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
    moodCaption: { fontSize: 14, color: colors.textMuted },
    section: { gap: spacing.xs },
    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionMeta: { fontSize: 13, color: colors.textMuted },
    fabWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      pointerEvents: 'box-none',
    },
    fab: {
      width: '100%',
      maxWidth: 512,
      minHeight: 54,
      borderRadius: 27,
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  }),
);
