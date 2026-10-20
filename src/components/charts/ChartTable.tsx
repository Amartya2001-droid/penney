import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../constants/theme';
import { makeStyles } from '../../theme/useTheme';

interface ChartTableProps {
  columns: string[];
  rows: string[][];
  /** Spoken name for the table, e.g. "Spending by category". */
  label: string;
}

/** The plain-table twin of a chart: every value, readable without the picture. */
export function ChartTable({ columns, rows, label }: ChartTableProps) {
  const styles = useStyles();
  return (
    <View style={styles.table} accessibilityLabel={label}>
      <View style={[styles.row, styles.headerRow]}>
        {columns.map((c, i) => (
          <Text key={c} style={[styles.cell, styles.header, i > 0 && styles.numeric]}>
            {c}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row[0]} style={styles.row} accessible accessibilityLabel={row.map((v, i) => `${columns[i]}: ${v}`).join(', ')}>
          {row.map((value, i) => (
            <Text key={`${row[0]}-${columns[i]}`} style={[styles.cell, i > 0 && styles.numeric]}>
              {value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    table: { gap: 0 },
    row: {
      flexDirection: 'row',
      paddingVertical: spacing.xs + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: { paddingTop: 0 },
    cell: { flex: 1, fontSize: 13, color: colors.text },
    header: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    numeric: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  }),
);
