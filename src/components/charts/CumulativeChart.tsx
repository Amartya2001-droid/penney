import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { spacing } from '../../constants/theme';
import { makeStyles, useTheme } from '../../theme/useTheme';
import { formatCompactCurrency, niceCeiling, type MonthSeries } from '../../utils/charts';
import { dateFromKey } from '../../utils/dates';
import { formatCurrency } from '../../utils/money';
import { useChartWidth } from './useChartWidth';

const PLOT_HEIGHT = 170;
/** SVG text doesn't inherit the app font on web, so name the system sans explicitly. */
const AXIS_FONT = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' });
const PAD = { top: 10, right: 12, bottom: 22, left: 44 };

const shortDate = (key: string) =>
  dateFromKey(key).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

interface CumulativeChartProps {
  series: MonthSeries;
}

/**
 * Discretionary spending so far (the accent line) against the allowance the month has earned
 * (the quiet reference line). Drag or tap across the chart to read any day; the readout above
 * the plot always shows a day, so no value depends on finding a pixel.
 */
export function CumulativeChart({ series }: CumulativeChartProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [width, onLayout] = useChartWidth();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { points, lastDay } = series;
  const daysInMonth = points.length;
  const yMax = useMemo(
    () =>
      niceCeiling(
        Math.max(
          series.monthBudget,
          ...points.map((p) => p.allowanceToDate),
          ...points.map((p) => p.spentToDate ?? 0),
        ),
      ),
    [points, series.monthBudget],
  );

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const x = (day: number) => PAD.left + ((day - 1) / Math.max(1, daysInMonth - 1)) * plotW;
  const y = (value: number) => PAD.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;

  const allowancePath = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.allowanceToDate)}`).join(' ');
  const spent = points.filter((p) => p.spentToDate !== null);
  const spentPath = spent.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.spentToDate as number)}`).join(' ');

  const activeDay = selectedDay ?? (lastDay || 1);
  const active = points[activeDay - 1];
  const yTicks = [0, yMax / 2, yMax];
  const xTicks = [1, 8, 15, 22, daysInMonth];

  const pick = (e: GestureResponderEvent) => {
    if (plotW <= 0) return;
    const ratio = (e.nativeEvent.locationX - PAD.left) / plotW;
    const day = Math.round(ratio * (daysInMonth - 1)) + 1;
    setSelectedDay(Math.min(daysInMonth, Math.max(1, day)));
  };

  const last = lastDay > 0 ? points[lastDay - 1] : null;
  const summary = last
    ? `Discretionary spending through ${shortDate(last.date)}: ${formatCurrency(last.spentToDate ?? 0)}, against an allowance of ${formatCurrency(last.allowanceToDate)} so far.`
    : 'This month has not started yet.';

  return (
    <View style={styles.wrap}>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text style={styles.readoutDate}>{shortDate(active.date)}</Text>
        {active.spentToDate === null ? (
          <Text style={styles.readoutMuted}>Still to come · allowance {formatCurrency(active.allowanceToDate)}</Text>
        ) : (
          <Text style={styles.readoutValue}>
            {formatCurrency(active.spentToDate)}{' '}
            <Text style={styles.readoutMuted}>spent of {formatCurrency(active.allowanceToDate)} allowance</Text>
          </Text>
        )}
      </View>

      <View
        onLayout={onLayout}
        style={{ height: PAD.top + PLOT_HEIGHT + PAD.bottom }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
      >
        {width > 0 ? (
          <Svg width={width} height={PAD.top + PLOT_HEIGHT + PAD.bottom} pointerEvents="none">
            {yTicks.map((tick) => (
              <Line
                key={`g${tick}`}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {yTicks.map((tick) => (
              <SvgText
                key={`t${tick}`}
                x={PAD.left - 6}
                y={y(tick) + 4}
                fontSize={11}
                fontFamily={AXIS_FONT}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {formatCompactCurrency(tick)}
              </SvgText>
            ))}
            {xTicks.map((day) => (
              <SvgText
                key={`x${day}`}
                x={x(day)}
                y={PAD.top + PLOT_HEIGHT + 16}
                fontSize={11}
                fontFamily={AXIS_FONT}
                fill={colors.textMuted}
                textAnchor={day === 1 ? 'start' : day === daysInMonth ? 'end' : 'middle'}
              >
                {day}
              </SvgText>
            ))}

            <Line
              x1={x(activeDay)}
              x2={x(activeDay)}
              y1={PAD.top}
              y2={PAD.top + PLOT_HEIGHT}
              stroke={colors.textMuted}
              strokeOpacity={0.35}
              strokeWidth={1}
            />

            <Path d={allowancePath} stroke={colors.chartContext} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {spent.length > 0 ? (
              <Path d={spentPath} stroke={colors.chartAccent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {last ? (
              <Circle
                cx={x(last.day)}
                cy={y(last.spentToDate ?? 0)}
                r={4}
                fill={colors.chartAccent}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>

      <View style={styles.legend}>
        <LegendKey color={colors.chartAccent} label="Spent so far" />
        <LegendKey color={colors.chartContext} label="Allowance earned" />
      </View>
    </View>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.lineKey, { backgroundColor: color }]} />
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
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    lineKey: { width: 14, height: 2, borderRadius: 1 },
    legendText: { fontSize: 12, color: colors.textMuted },
  }),
);
