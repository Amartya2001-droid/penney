import { Redirect } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartTable } from '../src/components/charts/ChartTable';
import { CategoryBars } from '../src/components/charts/CategoryBars';
import { CumulativeChart } from '../src/components/charts/CumulativeChart';
import { MonthColumns } from '../src/components/charts/MonthColumns';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { PeriodSwitcher } from '../src/components/PeriodSwitcher';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { CATEGORY_META } from '../src/constants/categories';
import { radius, spacing } from '../src/constants/theme';
import { useTodayKey } from '../src/hooks/useTodayKey';
import { usePenneyStore } from '../src/store/usePenneyStore';
import { makeStyles } from '../src/theme/useTheme';
import { categoryBreakdown, monthSeries, monthlyTotals } from '../src/utils/charts';
import { dateFromKey, monthKeyOf } from '../src/utils/dates';
import { formatCurrency } from '../src/utils/money';
import { formatMonthLabel, shiftMonthKey, type MonthKey } from '../src/utils/monthSummary';

export default function ChartsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const todayKey = useTodayKey();
  const thisMonth = monthKeyOf(todayKey);

  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const [monthKey, setMonthKey] = useState<MonthKey>(thisMonth);

  const oldestMonth = useMemo(
    () => (transactions.length > 0 ? monthKeyOf(transactions[transactions.length - 1].date) : thisMonth),
    [transactions, thisMonth],
  );

  const data = useMemo(() => {
    if (!budget) return null;
    return {
      series: monthSeries(transactions, budget, monthKey, todayKey),
      breakdown: categoryBreakdown(transactions, monthKey, todayKey),
      months: monthlyTotals(transactions, budget, monthKey, todayKey),
    };
  }, [transactions, budget, monthKey, todayKey]);

  if (!hasHydrated) return <LoadingScreen />;
  if (!budget || !data) return <Redirect href="/onboarding" />;

  const { series, breakdown, months } = data;
  const isCurrent = monthKey === thisMonth;
  const shortDate = (key: string) => dateFromKey(key).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <ScreenHeader title="Spending charts" subtitle="Discretionary spending. Essentials never count against you." />

      <PeriodSwitcher
        label={formatMonthLabel(monthKey)}
        previousLabel="Previous month"
        nextLabel="Next month"
        canGoPrevious={monthKey > oldestMonth}
        canGoNext={monthKey < thisMonth}
        onPrevious={() => setMonthKey(shiftMonthKey(monthKey, -1))}
        onNext={() => setMonthKey(shiftMonthKey(monthKey, 1))}
      />

      <ChartCard
        title={isCurrent ? 'Month so far' : 'Through the month'}
        description="Your running total against the allowance the month has earned. Below the grey line is ahead of pace."
        table={
          <ChartTable
            label="Spending and allowance by day"
            columns={['Day', 'Spent', 'Allowance']}
            rows={series.points
              .filter((p) => p.spentToDate !== null)
              .map((p) => [shortDate(p.date), formatCurrency(p.spentToDate ?? 0), formatCurrency(p.allowanceToDate)])}
          />
        }
      >
        <CumulativeChart key={monthKey} series={series} />
      </ChartCard>

      <ChartCard
        title="Where it went"
        description={`${formatCurrency(breakdown.discretionaryTotal)} discretionary · ${formatCurrency(breakdown.essentialTotal)} on essentials`}
        table={
          breakdown.categories.length > 0 ? (
            <ChartTable
              label="Spending by category"
              columns={['Category', 'Spent', 'Share', 'Purchases']}
              rows={breakdown.categories.map((c) => [
                CATEGORY_META[c.category].label,
                formatCurrency(c.total),
                `${Math.round(c.share * 100)}%`,
                String(c.count),
              ])}
            />
          ) : null
        }
      >
        {breakdown.categories.length > 0 ? (
          <CategoryBars categories={breakdown.categories} />
        ) : (
          <Text style={styles.empty}>No discretionary spending {isCurrent ? 'yet this month' : 'that month'}.</Text>
        )}
      </ChartCard>

      <ChartCard
        title="Month by month"
        description="Budgets use your current settings, since past budgets aren't stored."
        table={
          months.length > 1 ? (
            <ChartTable
              label="Discretionary spending by month"
              columns={['Month', 'Spent', 'Budget', 'Essentials']}
              rows={months.map((m) => [
                `${formatMonthLabel(m.monthKey)}${m.inProgress ? ' (so far)' : ''}`,
                formatCurrency(m.discretionary),
                formatCurrency(m.budget),
                formatCurrency(m.essential),
              ])}
            />
          ) : null
        }
      >
        {months.length > 1 ? (
          <MonthColumns key={monthKey} months={months} />
        ) : (
          <Text style={styles.empty}>
            This fills in once you have more than one month of expenses. Until then, the chart above tells the
            story.
          </Text>
        )}
      </ChartCard>
    </ScrollView>
  );
}

interface ChartCardProps {
  title: string;
  description: string;
  /** The table view of the same data; null hides the toggle. */
  table: ReactNode;
  children: ReactNode;
}

function ChartCard({ title, description, table, children }: ChartCardProps) {
  const styles = useStyles();
  const [showTable, setShowTable] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        {table ? (
          <Pressable
            onPress={() => setShowTable((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
            hitSlop={8}
          >
            <Text style={styles.toggle}>{showTable ? 'Chart' : 'Table'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.description}>{description}</Text>
      {showTable && table ? table : children}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    toggle: { fontSize: 14, fontWeight: '600', color: colors.text, textDecorationLine: 'underline' },
    description: { fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: -spacing.sm },
    empty: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  }),
);
