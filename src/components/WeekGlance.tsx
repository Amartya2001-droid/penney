import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PACE_VISUALS } from '../constants/moods';
import { radius, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/money';
import type { WeekSummary } from '../utils/weekSummary';
import { makeStyles, useTheme } from '../theme/useTheme';

interface WeekGlanceProps {
  summary: WeekSummary;
  onPress: () => void;
}

/** Dashboard card: this week's discretionary spending so far, linking to the weekly summary. */
export function WeekGlance({ summary, onPress }: WeekGlanceProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pace = PACE_VISUALS[summary.status];
  const spent = formatCurrency(summary.discretionaryTotal);
  const target = formatCurrency(summary.targetToDate);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`This week: spent ${spent} of a ${target} target so far. ${pace.label}. Opens the weekly summary.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>This week</Text>
        <Text style={styles.value}>
          {spent} <Text style={styles.of}>of {target} so far</Text>
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: colors[pace.tone] }]}>
        <Text style={styles.pillText}>{pace.label}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
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
    text: { flex: 1, gap: 2, minWidth: 0 },
    title: { fontSize: 13, color: colors.textMuted },
    value: { fontSize: 17, fontWeight: '700', color: colors.text },
    of: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
    pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    pillText: { color: colors.onTone, fontSize: 12, fontWeight: '700' },
    chevron: { fontSize: 22, color: colors.textMuted },
  }),
);
