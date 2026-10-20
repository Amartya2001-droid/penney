import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { CATEGORY_META } from '../../constants/categories';
import { spacing } from '../../constants/theme';
import { makeStyles, useTheme } from '../../theme/useTheme';
import type { CategoryShare } from '../../utils/charts';
import { formatCurrency } from '../../utils/money';

interface CategoryBarsProps {
  categories: CategoryShare[];
}

/**
 * Ranked horizontal bars, one colour for every bar (the categories have no natural order, so
 * colour would only repeat what length already shows). The value and share sit at each bar's tip.
 */
export function CategoryBars({ categories }: CategoryBarsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const largest = categories[0]?.total ?? 0;

  return (
    <View style={styles.list}>
      {categories.map((c) => {
        const label = CATEGORY_META[c.category].label;
        const width: DimensionValue = `${largest > 0 ? Math.max(1, (c.total / largest) * 100) : 0}%`;
        const share = `${Math.round(c.share * 100)}%`;
        return (
          <View
            key={c.category}
            style={styles.row}
            accessible
            accessibilityLabel={`${label}: ${formatCurrency(c.total)}, ${share} of discretionary spending, ${c.count} ${c.count === 1 ? 'purchase' : 'purchases'}.`}
          >
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            <View style={styles.barArea}>
              <View style={[styles.bar, { width, backgroundColor: colors.chartAccent }]} />
            </View>
            <Text style={styles.value}>
              {formatCurrency(c.total)} <Text style={styles.share}>{share}</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    list: { gap: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    label: { width: 96, fontSize: 14, color: colors.text },
    barArea: { flex: 1, height: 12, justifyContent: 'center' },
    bar: { height: 12, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    value: { minWidth: 92, textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
    share: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  }),
);
