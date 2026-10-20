import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import type { MonthSnapshot } from '../types';
import { formatCurrency } from '../utils/money';

interface SummaryStatsProps {
  snapshot: MonthSnapshot;
}

export function SummaryStats({ snapshot }: SummaryStatsProps) {
  const { target } = snapshot;
  return (
    <View style={styles.row}>
      <StatTile label="Left today" value={formatCurrency(target.leftToSpendToday)} />
      <StatTile label="Per day, rest of month" value={formatCurrency(target.remainingDailyTarget)} />
      <StatTile
        label="Projected savings"
        value={formatCurrency(snapshot.projectedMonthEndSavings)}
        sub={`Goal ${formatCurrency(snapshot.savingsGoal)}`}
        valueColor={snapshot.savingsGoalAtRisk ? colors.danger : colors.success}
      />
    </View>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

function StatTile({ label, value, sub, valueColor }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: 100,
    minWidth: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
});
