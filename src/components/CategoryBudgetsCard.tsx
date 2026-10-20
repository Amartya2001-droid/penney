import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { CATEGORY_META } from '../constants/categories';
import { radius, spacing, type Tone } from '../constants/theme';
import type { CategoryBudgetLine, CategoryBudgetStatus, CategoryBudgetSummary } from '../utils/categoryBudgets';
import { formatCurrency } from '../utils/money';
import { makeStyles, useTheme } from '../theme/useTheme';

const STATUS_TONE: Record<CategoryBudgetStatus, Tone> = {
  ok: 'success',
  fast: 'info',
  near: 'warning',
  over: 'danger',
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const toPercent = (ratio: number): DimensionValue => `${Math.round(clamp01(ratio) * 1000) / 10}%`;

function statusText(line: CategoryBudgetLine): string {
  if (line.status === 'over') return `Over by ${formatCurrency(-line.remaining)}`;
  const left = `${formatCurrency(line.remaining)} left`;
  if (line.status === 'near') return `${left}, nearly used up`;
  if (line.status === 'fast') return `${left}, spending faster than the month`;
  return left;
}

interface CategoryBudgetsCardProps {
  summary: CategoryBudgetSummary;
  onEdit: () => void;
}

/** Dashboard card: this month's spending against each category limit, or a prompt to set some. */
export function CategoryBudgetsCard({ summary, onEdit }: CategoryBudgetsCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (summary.lines.length === 0) {
    return (
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Set category limits. Opens Settings."
        style={({ pressed }) => [styles.prompt, pressed && styles.pressed]}
      >
        <View style={styles.promptText}>
          <Text style={styles.title}>Category limits</Text>
          <Text style={styles.muted}>Cap takeout, shopping, or anything else per month.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Category limits</Text>
        <Pressable onPress={onEdit} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>

      {summary.lines.map((line) => {
        const label = CATEGORY_META[line.category].label;
        const tone = colors[STATUS_TONE[line.status]];
        const fill = line.limit > 0 ? line.spent / line.limit : line.spent > 0 ? 1 : 0;
        const marker = line.limit > 0 ? line.expectedByNow / line.limit : 0;
        return (
          <View
            key={line.category}
            style={styles.row}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${label}: ${formatCurrency(line.spent)} of ${formatCurrency(line.limit)}. ${statusText(line)}.`}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp01(fill) * 100) }}
          >
            <View style={styles.rowTop}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.amounts}>
                {formatCurrency(line.spent)} <Text style={styles.muted}>of {formatCurrency(line.limit)}</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: toPercent(fill), backgroundColor: tone }]} />
              {line.limit > 0 ? <View style={[styles.marker, { left: toPercent(marker) }]} /> : null}
            </View>
            <Text style={[styles.status, { color: line.status === 'ok' ? colors.textMuted : tone }]}>
              {statusText(line)}
            </Text>
          </View>
        );
      })}

      <Text style={styles.muted}>The marker shows how much of each limit the month so far allows.</Text>
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
      gap: spacing.md,
    },
    prompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    pressed: { backgroundColor: colors.surfaceMuted },
    promptText: { flex: 1, gap: 2 },
    chevron: { fontSize: 22, color: colors.textMuted },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    edit: { fontSize: 14, fontWeight: '600', color: colors.text, textDecorationLine: 'underline' },
    row: { gap: spacing.xs },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
    label: { fontSize: 14, fontWeight: '600', color: colors.text },
    amounts: { fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
    track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, overflow: 'visible' },
    fill: { height: '100%', borderRadius: 5 },
    marker: {
      position: 'absolute',
      top: -3,
      bottom: -3,
      width: 2,
      marginLeft: -1,
      borderRadius: 1,
      backgroundColor: colors.text,
    },
    status: { fontSize: 12 },
    muted: { fontSize: 12, color: colors.textMuted },
  }),
);
