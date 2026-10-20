import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import { streakLine } from '../services/penney/streakLine';
import type { DateKey } from '../types';
import { formatCurrency } from '../utils/money';
import type { StreakDay, StreakSummary } from '../utils/streaks';
import { makeStyles, useTheme } from '../theme/useTheme';

interface StreakCardProps {
  streak: StreakSummary;
  todayKey: DateKey;
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

function todayHint(streak: StreakSummary): string | null {
  if (streak.trackingSince === null || streak.overToday) return null;
  const next = streak.current + 1;
  if (streak.leftToday > 0.005) {
    return `Keep today within its ${formatCurrency(streak.targetToday)} target (${formatCurrency(streak.leftToday)} to go) to make it ${days(next)}.`;
  }
  return `You’re right at today’s ${formatCurrency(streak.targetToday)} target. Anything more discretionary today ends the streak.`;
}

/** Dashboard card: the current savings streak, the last two weeks as dots, and Penney's take. */
export function StreakCard({ streak, todayKey }: StreakCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const hint = todayHint(streak);
  const kept = streak.recent.filter((d) => d.state === 'kept').length;
  const judged = streak.recent.filter((d) => d.state === 'kept' || d.state === 'missed').length;

  const dotStyle = (day: StreakDay) => {
    switch (day.state) {
      case 'kept':
        return { backgroundColor: colors.success, borderColor: colors.success };
      case 'missed':
        return { backgroundColor: colors.warning, borderColor: colors.warning };
      case 'today':
        return { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 2 };
      case 'today_missed':
        return { backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 2 };
      default:
        return { backgroundColor: 'transparent', borderColor: colors.border, borderStyle: 'dashed' as const };
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={styles.headline}
          accessible
          accessibilityLabel={`Savings streak: ${days(streak.current)}. Best: ${days(streak.best)}.`}
        >
          <Text style={styles.label}>Savings streak</Text>
          <Text style={styles.value}>
            {streak.current} <Text style={styles.unit}>{streak.current === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
        <View style={styles.sideStats}>
          <Text style={styles.side}>
            Best <Text style={styles.sideValue}>{streak.best}</Text>
          </Text>
          <Text style={styles.side}>
            No-spend <Text style={styles.sideValue}>{streak.currentNoSpend}</Text>
          </Text>
        </View>
      </View>

      {streak.milestoneReached !== null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{streak.milestoneReached}-day milestone</Text>
        </View>
      ) : null}

      <Text style={styles.line}>“{streakLine(streak, todayKey)}”</Text>

      <View
        style={styles.dots}
        accessible
        accessibilityLabel={
          judged > 0
            ? `Last ${streak.recent.length} days: ${kept} of ${judged} finished days within target.`
            : 'No finished days to show yet.'
        }
      >
        {streak.recent.map((day) => (
          <View key={day.date} style={[styles.dot, dotStyle(day)]} />
        ))}
      </View>
      <View style={styles.dotsLegend}>
        <Text style={styles.muted}>2 weeks ago</Text>
        <Text style={styles.muted}>Today</Text>
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {streak.nextMilestone !== null && streak.trackingSince !== null && !streak.overToday ? (
        <Text style={styles.muted}>
          Next milestone: {days(streak.nextMilestone)} ({streak.nextMilestone - streak.current} to go)
        </Text>
      ) : null}
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
      gap: spacing.sm,
    },
    header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
    headline: { gap: 2 },
    label: { fontSize: 13, color: colors.textMuted },
    value: { fontSize: 28, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    unit: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
    sideStats: { alignItems: 'flex-end', gap: 2 },
    side: { fontSize: 13, color: colors.textMuted },
    sideValue: { fontWeight: '700', color: colors.text },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.successSoft,
      borderColor: colors.successBorder,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: { fontSize: 12, fontWeight: '700', color: colors.success },
    line: { fontSize: 14, lineHeight: 20, color: colors.text, fontStyle: 'italic' },
    dots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
    dotsLegend: { flexDirection: 'row', justifyContent: 'space-between' },
    hint: { fontSize: 13, lineHeight: 18, color: colors.text },
    muted: { fontSize: 12, color: colors.textMuted },
  }),
);
