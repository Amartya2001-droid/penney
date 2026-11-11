import { StyleSheet, View } from 'react-native';
import type { DateKey } from '../types';
import { addDays, isValidDateKey } from '../utils/dates';
import { spacing, radius } from '../constants/theme';
import { makeStyles, useTheme } from '../theme/useTheme';
import { Button } from './Button';

/** Browser calendar input avoids stepping through hundreds of days for an older receipt. */
export function DateStepper({ value, onChange, maxDate }: {
  value: DateKey; onChange: (value: DateKey) => void; maxDate: DateKey;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  return (
    <View style={styles.row}>
      <Button label="‹" accessibilityLabel="Previous day" variant="ghost" onPress={() => onChange(addDays(value, -1))} />
      <input
        type="date" aria-label="Expense date" value={value} max={maxDate}
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (isValidDateKey(next) && next <= maxDate) onChange(next);
        }}
        style={{ flex: 1, minWidth: 0, minHeight: 44, border: 0, background: 'transparent', color: colors.text, colorScheme: scheme, font: 'inherit', fontSize: 16, padding: 4 }}
      />
      <Button label="›" accessibilityLabel="Next day" variant="ghost" disabled={value >= maxDate} onPress={() => onChange(addDays(value, 1))} />
    </View>
  );
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.xs },
}));
