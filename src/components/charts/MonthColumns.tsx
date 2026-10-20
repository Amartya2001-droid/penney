import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../constants/theme';
import { makeStyles, useTheme } from '../../theme/useTheme';
import { formatCompactCurrency, niceCeiling, type MonthTotal } from '../../utils/charts';
import { formatMonthLabel, parseMonthKey } from '../../utils/monthSummary';
import { formatCurrency } from '../../utils/money';

const PLOT_HEIGHT = 140;
/** Room above the tallest column for its value label. */
const LABEL_ROOM = 18;
const OVER = 0.005;

const shortMonth = (monthKey: string) => {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(year, month - 1, 1).toLocaleDateString('en-CA', { month: 'short' });
};

interface MonthColumnsProps {
  months: MonthTotal[];
}

/**
 * Discretionary spending per month as columns, with each month's budget as a tick. A month that
 * went over its budget is drawn in the warning colour and says so in the readout, so the state
 * never rests on colour alone. Tap a column to read it.
 */
export function MonthColumns({ months }: MonthColumnsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [selected, setSelected] = useState(months.length - 1);
  const scale = niceCeiling(Math.max(1, ...months.map((m) => Math.max(m.discretionary, m.budget))));
  const active = months[Math.min(selected, months.length - 1)];
  const activeOver = active.discretionary > active.budget + OVER;

  return (
    <View style={styles.wrap}>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text style={styles.readoutDate}>
          {formatMonthLabel(active.monthKey)}
          {active.inProgress ? ' (so far)' : ''}
        </Text>
        <Text style={styles.readoutValue}>
          {formatCurrency(active.discretionary)}{' '}
          <Text style={styles.readoutMuted}>
            of {formatCurrency(active.budget)}
            {activeOver ? `, over by ${formatCurrency(active.discretionary - active.budget)}` : ''}
          </Text>
        </Text>
      </View>

      <View style={styles.chart}>
        {months.map((m, i) => {
          const over = m.discretionary > m.budget + OVER;
          const barHeight = (m.discretionary / scale) * PLOT_HEIGHT;
          const tick = (m.budget / scale) * PLOT_HEIGHT;
          const isActive = i === selected;
          return (
            <Pressable
              key={m.monthKey}
              style={styles.column}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${formatMonthLabel(m.monthKey)}${m.inProgress ? ' so far' : ''}: ${formatCurrency(m.discretionary)} of ${formatCurrency(m.budget)} budget${over ? ', over budget' : ''}.`}
            >
              <View style={styles.plot}>
                <Text style={[styles.cap, { bottom: Math.max(barHeight, tick) + 4 }]} numberOfLines={1}>
                  {formatCompactCurrency(m.discretionary)}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(m.discretionary > 0 ? 3 : 0, barHeight),
                      backgroundColor: over ? colors.warning : colors.chartAccent,
                      opacity: m.inProgress ? 0.55 : 1,
                    },
                  ]}
                />
                <View style={[styles.tick, { bottom: tick }]} />
              </View>
              <Text style={[styles.month, isActive && styles.monthActive]}>{shortMonth(m.monthKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Swatch color={colors.chartAccent} label="Discretionary" />
        {months.some((m) => m.discretionary > m.budget + OVER) ? (
          <Swatch color={colors.warning} label="Over budget" />
        ) : null}
        <View style={styles.legendItem}>
          <View style={styles.tickKey} />
          <Text style={styles.legendText}>Budget</Text>
        </View>
        {months.some((m) => m.inProgress) ? <Text style={styles.legendText}>Faded: month in progress</Text> : null}
      </View>
    </View>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
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
    wrap: { gap: spacing.sm },
    readout: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
    readoutDate: { fontSize: 13, fontWeight: '700', color: colors.text },
    readoutValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    readoutMuted: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
    column: { flex: 1, alignItems: 'center', gap: spacing.xs, minWidth: 0 },
    cap: {
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 11,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    plot: {
      width: '100%',
      height: PLOT_HEIGHT + LABEL_ROOM,
      justifyContent: 'flex-end',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bar: { width: '60%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    tick: {
      position: 'absolute',
      left: '12%',
      right: '12%',
      height: 2,
      marginBottom: -1,
      borderRadius: 1,
      backgroundColor: colors.text,
    },
    month: { fontSize: 12, color: colors.textMuted },
    monthActive: { color: colors.text, fontWeight: '700' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    swatch: { width: 10, height: 10, borderRadius: 2 },
    tickKey: { width: 12, height: 2, borderRadius: 1, backgroundColor: colors.text },
    legendText: { fontSize: 12, color: colors.textMuted },
  }),
);
