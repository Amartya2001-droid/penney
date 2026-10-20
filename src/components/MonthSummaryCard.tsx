import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { CATEGORY_META } from '../constants/categories';
import { radius, spacing } from '../constants/theme';
import type { MonthSummary } from '../utils/monthSummary';
import { formatCurrency } from '../utils/money';
import { makeStyles } from '../theme/useTheme';

const MAX_CATEGORIES = 5;

interface MonthSummaryCardProps {
  summary: MonthSummary;
  /** Current monthly discretionary budget, for the "of $X" comparison. Null hides it. */
  discretionaryBudget: number | null;
}

export function MonthSummaryCard({ summary, discretionaryBudget }: MonthSummaryCardProps) {
  const styles = useStyles();
  const top = summary.byCategory.slice(0, MAX_CATEGORIES);
  const largest = top[0]?.total ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.totals}>
        <Total label="Total spent" value={formatCurrency(summary.total)} strong />
        <Total label="Essential" value={formatCurrency(summary.essentialTotal)} />
        <Total
          label="Discretionary"
          value={formatCurrency(summary.discretionaryTotal)}
          sub={discretionaryBudget !== null ? `of ${formatCurrency(discretionaryBudget)} budget` : undefined}
          warn={discretionaryBudget !== null && summary.discretionaryTotal > discretionaryBudget}
        />
      </View>

      {top.length > 0 ? (
        <View style={styles.categories}>
          <Text style={styles.heading}>Top categories</Text>
          {top.map((c) => {
            const width: DimensionValue = `${largest > 0 ? Math.max(4, (c.total / largest) * 100) : 0}%`;
            return (
              <View key={c.category} style={styles.catRow}>
                <View style={styles.catLabelRow}>
                  <Text style={styles.catLabel}>
                    {CATEGORY_META[c.category].label} <Text style={styles.catCount}>×{c.count}</Text>
                  </Text>
                  <Text style={styles.catValue}>{formatCurrency(c.total)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width }]} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

interface TotalProps {
  label: string;
  value: string;
  sub?: string;
  strong?: boolean;
  warn?: boolean;
}

function Total({ label, value, sub, strong = false, warn = false }: TotalProps) {
  const styles = useStyles();
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text
        style={[styles.totalValue, strong && styles.totalStrong, warn && styles.totalWarn]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {sub ? <Text style={styles.totalSub}>{sub}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    totals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    total: { flexGrow: 1, flexBasis: 90, gap: 2 },
    totalLabel: { fontSize: 12, color: colors.textMuted },
    totalValue: { fontSize: 17, fontWeight: '700', color: colors.text },
    totalStrong: { fontSize: 20 },
    totalWarn: { color: colors.danger },
    totalSub: { fontSize: 12, color: colors.textMuted },
    categories: { gap: spacing.sm },
    heading: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    catRow: { gap: 4 },
    catLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    catLabel: { fontSize: 14, color: colors.text },
    catCount: { color: colors.textMuted },
    catValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  }),
);
