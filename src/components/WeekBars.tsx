import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import type { DateKey } from '../types';
import { dateFromKey } from '../utils/dates';
import { formatCurrency } from '../utils/money';
import type { WeekDay } from '../utils/weekSummary';
import { makeStyles, useTheme } from '../theme/useTheme';

const CHART_HEIGHT = 120;

interface WeekBarsProps {
  days: WeekDay[];
  todayKey: DateKey;
}

const weekdayShort = (key: DateKey) => dateFromKey(key).toLocaleDateString('en-CA', { weekday: 'short' });
const weekdayLong = (key: DateKey) => dateFromKey(key).toLocaleDateString('en-CA', { weekday: 'long' });

/** Discretionary spending per day, with each day's target as a tick. Over-target days are highlighted. */
export function WeekBars({ days, todayKey }: WeekBarsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const scale = Math.max(1, ...days.map((d) => Math.max(d.discretionary, d.target)));

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        {days.map((day) => {
          const over = day.discretionary > day.target + 0.005;
          const barHeight = (day.discretionary / scale) * CHART_HEIGHT;
          const targetBottom = (day.target / scale) * CHART_HEIGHT;
          const label = day.isFuture
            ? `${weekdayLong(day.date)}: still to come, target ${formatCurrency(day.target)}`
            : `${weekdayLong(day.date)}: spent ${formatCurrency(day.discretionary)} of ${formatCurrency(day.target)} target${over ? ', over' : ''}`;
          return (
            <View key={day.date} style={styles.column} accessible accessibilityLabel={label}>
              <Text style={[styles.amount, day.isFuture && styles.muted]} numberOfLines={1}>
                {day.isFuture ? '' : day.discretionary > 0 ? `$${Math.round(day.discretionary)}` : '–'}
              </Text>
              <View style={styles.plot}>
                {day.isFuture ? (
                  <View style={[styles.futureBar, { height: Math.max(2, targetBottom) }]} />
                ) : (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(day.discretionary > 0 ? 3 : 0, barHeight),
                        backgroundColor: over ? colors.warning : colors.primary,
                      },
                    ]}
                  />
                )}
                <View style={[styles.targetTick, { bottom: targetBottom }]} />
              </View>
              <Text style={[styles.day, day.date === todayKey && styles.today]}>{weekdayShort(day.date)}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <LegendSwatch color={colors.primary} label="Spent" />
        <LegendSwatch color={colors.warning} label="Over the day’s target" />
        <View style={styles.legendItem}>
          <View style={styles.legendTick} />
          <Text style={styles.legendText}>Daily target</Text>
        </View>
      </View>
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: spacing.md },
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
    column: { flex: 1, alignItems: 'center', gap: spacing.xs, minWidth: 0 },
    amount: { fontSize: 11, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
    muted: { color: colors.textMuted },
    plot: {
      width: '100%',
      height: CHART_HEIGHT,
      justifyContent: 'flex-end',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bar: { width: '70%', maxWidth: 28, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 },
    futureBar: {
      width: '70%',
      maxWidth: 28,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderTopLeftRadius: radius.sm / 2,
      borderTopRightRadius: radius.sm / 2,
    },
    targetTick: {
      position: 'absolute',
      left: '8%',
      right: '8%',
      height: 2,
      marginBottom: -1,
      borderRadius: 1,
      backgroundColor: colors.text,
    },
    day: { fontSize: 12, color: colors.textMuted },
    today: { color: colors.text, fontWeight: '700' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    swatch: { width: 10, height: 10, borderRadius: 2 },
    legendTick: { width: 12, height: 2, borderRadius: 1, backgroundColor: colors.text },
    legendText: { fontSize: 12, color: colors.textMuted },
  }),
);
