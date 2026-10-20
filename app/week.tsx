import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { PenneyCharacter } from '../src/components/PenneyCharacter';
import { PeriodSwitcher } from '../src/components/PeriodSwitcher';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { WeekBars } from '../src/components/WeekBars';
import { CATEGORY_META } from '../src/constants/categories';
import { PACE_VISUALS } from '../src/constants/moods';
import { radius, spacing } from '../src/constants/theme';
import { useTodayKey } from '../src/hooks/useTodayKey';
import { weeklyVerdict } from '../src/services/penney/weeklyVerdict';
import { usePenneyStore } from '../src/store/usePenneyStore';
import { dateFromKey } from '../src/utils/dates';
import { formatCurrency } from '../src/utils/money';
import {
  compareWithPreviousWeek,
  formatWeekRange,
  shiftWeek,
  startOfWeek,
  summarizeWeek,
} from '../src/utils/weekSummary';
import { makeStyles, useTheme } from '../src/theme/useTheme';

function describeChange(percent: number | null, previousSameDays: number): string {
  if (percent === null) return previousSameDays === 0 ? 'Nothing spent on those days last week' : '—';
  const rounded = Math.round(Math.abs(percent));
  if (rounded === 0) return 'Same as last week';
  return `${rounded}% ${percent < 0 ? 'less' : 'more'} than last week`;
}

export default function WeekScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const todayKey = useTodayKey();
  const thisWeek = startOfWeek(todayKey);

  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const [weekStart, setWeekStart] = useState(thisWeek);

  const oldestWeek = useMemo(
    () => (transactions.length > 0 ? startOfWeek(transactions[transactions.length - 1].date) : thisWeek),
    [transactions, thisWeek],
  );

  const data = useMemo(() => {
    if (!budget) return null;
    const summary = summarizeWeek(transactions, budget, weekStart, todayKey);
    const previous = summarizeWeek(transactions, budget, shiftWeek(weekStart, -1), todayKey);
    return {
      summary,
      comparison: compareWithPreviousWeek(summary, previous),
      verdict: weeklyVerdict(summary),
    };
  }, [transactions, budget, weekStart, todayKey]);

  if (!hasHydrated) return <LoadingScreen />;
  if (!budget || !data) return <Redirect href="/onboarding" />;

  const { summary, comparison, verdict } = data;
  const isCurrentWeek = weekStart === thisWeek;
  const pace = PACE_VISUALS[summary.status];
  const pct = summary.percentOffTarget;
  const paceDetail =
    pct === null
      ? 'No discretionary allowance this week'
      : Math.round(Math.abs(pct)) === 0
        ? 'Exactly on target'
        : `${Math.round(Math.abs(pct))}% ${pct < 0 ? 'under' : 'over'} target`;
  const biggest = summary.biggestDay;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <ScreenHeader title="Weekly summary" subtitle="Monday to Sunday, discretionary spending against your daily targets." />

      <PeriodSwitcher
        label={isCurrentWeek ? `This week · ${formatWeekRange(weekStart)}` : formatWeekRange(weekStart)}
        previousLabel="Previous week"
        nextLabel="Next week"
        canGoPrevious={weekStart > oldestWeek}
        canGoNext={weekStart < thisWeek}
        onPrevious={() => setWeekStart(shiftWeek(weekStart, -1))}
        onNext={() => setWeekStart(shiftWeek(weekStart, 1))}
      />

      <View style={styles.verdict}>
        <PenneyCharacter mood={verdict.mood} size={64} />
        <View style={styles.verdictText}>
          <Text style={styles.verdictLabel}>{isCurrentWeek ? 'Penney on this week' : 'Penney on that week'}</Text>
          <Text style={styles.verdictMessage}>“{verdict.message}”</Text>
        </View>
      </View>
      {verdict.note ? <Text style={styles.note}>{verdict.note}</Text> : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Day by day</Text>
          <View style={[styles.pill, { backgroundColor: colors[pace.tone] }]}>
            <Text style={styles.pillText}>{pace.label}</Text>
          </View>
        </View>
        <WeekBars days={summary.days} todayKey={todayKey} />
      </View>

      <View style={styles.tiles}>
        <Tile
          label={isCurrentWeek ? 'Discretionary so far' : 'Discretionary'}
          value={formatCurrency(summary.discretionaryTotal)}
          sub={`${paceDetail} (${formatCurrency(summary.targetToDate)})`}
        />
        <Tile
          label="Compared with last week"
          value={comparison.percentChange === null ? '—' : `${comparison.percentChange > 0 ? '+' : ''}${Math.round(comparison.percentChange)}%`}
          sub={describeChange(comparison.percentChange, comparison.previousSameDays)}
          valueColor={
            comparison.percentChange === null
              ? undefined
              : comparison.percentChange > 0
                ? colors.warning
                : colors.success
          }
        />
        <Tile
          label="No-spend days"
          value={`${summary.noSpendDays} of ${summary.elapsedDays}`}
          sub={biggest ? `Biggest: ${dateFromKey(biggest.date).toLocaleDateString('en-CA', { weekday: 'long' })}, ${formatCurrency(biggest.discretionary)}` : 'No discretionary spending'}
        />
        <Tile
          label="Essentials"
          value={formatCurrency(summary.essentialTotal)}
          sub="Never counted against Penney’s mood"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Where it went</Text>
        {summary.topCategories.length === 0 ? (
          <Text style={styles.muted}>No discretionary spending {isCurrentWeek ? 'yet this week' : 'that week'}.</Text>
        ) : (
          summary.topCategories.map((c) => (
            <View key={c.category} style={styles.catRow}>
              <Text style={styles.catLabel}>
                {CATEGORY_META[c.category].label} <Text style={styles.muted}>×{c.count}</Text>
              </Text>
              <Text style={styles.catValue}>{formatCurrency(c.total)}</Text>
            </View>
          ))
        )}
        {isCurrentWeek ? (
          <Text style={styles.muted}>
            Full-week target: {formatCurrency(summary.targetFullWeek)} ·{' '}
            {formatCurrency(Math.max(0, summary.targetFullWeek - summary.discretionaryTotal))} left for the rest of the week
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

interface TileProps {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}

function Tile({ label, value, sub, valueColor }: TileProps) {
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileSub}>{sub}</Text>
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
    verdict: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    verdictText: { flex: 1, gap: spacing.xs },
    verdictLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    verdictMessage: { fontSize: 16, lineHeight: 22, color: colors.text, fontStyle: 'italic' },
    note: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.info,
      backgroundColor: colors.infoSoft,
      borderRadius: radius.md,
      padding: spacing.md,
    },
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
    pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    pillText: { color: colors.onTone, fontSize: 12, fontWeight: '700' },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tile: {
      flexGrow: 1,
      flexBasis: 150,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 2,
    },
    tileLabel: { fontSize: 12, color: colors.textMuted },
    tileValue: { fontSize: 20, fontWeight: '700', color: colors.text },
    tileSub: { fontSize: 12, lineHeight: 16, color: colors.textMuted },
    catRow: { flexDirection: 'row', justifyContent: 'space-between' },
    catLabel: { fontSize: 14, color: colors.text },
    catValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    muted: { fontSize: 13, color: colors.textMuted },
  }),
);
