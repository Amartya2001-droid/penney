import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { PACE_VISUALS } from '../constants/moods';
import { colors, radius, spacing } from '../constants/theme';
import type { MonthSnapshot } from '../types';
import { formatCurrency } from '../utils/money';

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const toPercent = (ratio: number): DimensionValue => `${Math.round(ratio * 1000) / 10}%`;

interface PaceProgressBarProps {
  snapshot: MonthSnapshot;
}

export function PaceProgressBar({ snapshot }: PaceProgressBarProps) {
  const { target, actual, pace } = snapshot;
  const visual = PACE_VISUALS[pace.status];

  const scaleMax = Math.max(target.adjustedDiscretionaryBudget, target.allowanceToDate, 1);
  const fillRatio = clamp01(actual.spentToDate / scaleMax);
  const markerRatio = clamp01(target.allowanceToDate / scaleMax);
  const overMonthBudget = actual.spentToDate > target.adjustedDiscretionaryBudget;
  const averageTargetPerDay = target.allowanceToDate / target.dayOfMonth;

  const pct = pace.percentOffPace;
  let paceSentence: string;
  if (pct === null) {
    paceSentence = 'No discretionary allowance left this month';
  } else if (Math.round(Math.abs(pct)) === 0) {
    paceSentence = 'Exactly on pace';
  } else {
    paceSentence = `${Math.round(Math.abs(pct))}% ${pct < 0 ? 'under' : 'over'} pace`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Discretionary pace</Text>
        <View style={[styles.pill, { backgroundColor: visual.color }]}>
          <Text style={styles.pillText}>{visual.label}</Text>
        </View>
      </View>

      <View
        style={styles.barWrap}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Spent ${formatCurrency(actual.spentToDate)} against a target of ${formatCurrency(target.allowanceToDate)} so far. ${paceSentence}.`}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(fillRatio * 100) }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: toPercent(fillRatio), backgroundColor: visual.color }]} />
        </View>
        <View style={[styles.marker, { left: toPercent(markerRatio) }]} />
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendStrong}>Spent {formatCurrency(actual.spentToDate)}</Text>
        <Text style={styles.legend}>Target so far {formatCurrency(target.allowanceToDate)}</Text>
      </View>

      <Text style={styles.detail}>
        {paceSentence} · {formatCurrency(actual.dailyPace)}/day vs {formatCurrency(averageTargetPerDay)}/day target
      </Text>
      <Text style={styles.detail}>
        Month budget {formatCurrency(target.adjustedDiscretionaryBudget)}
        {target.unplannedEssentialTotal > 0
          ? ` (adjusted for ${formatCurrency(target.unplannedEssentialTotal)} in unplanned essentials)`
          : ''}
        {overMonthBudget ? ' · over the month budget' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  barWrap: { height: 26, justifyContent: 'center', marginVertical: spacing.xs },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 7 },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  legendStrong: { fontSize: 14, fontWeight: '600', color: colors.text },
  legend: { fontSize: 14, color: colors.textMuted },
  detail: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});
