import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import type { DateKey } from '../types';
import { addDays, daysBetween } from '../utils/dates';
import { formatLongDate } from '../utils/formatDate';
import { makeStyles } from '../theme/useTheme';

interface DateStepperProps {
  value: DateKey;
  onChange: (value: DateKey) => void;
  /** Latest selectable date (usually today). */
  maxDate: DateKey;
}

function relativeLabel(value: DateKey, today: DateKey): string | null {
  const diff = daysBetween(value, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return null;
}

/** A dependency-free date picker that works on iOS, Android, and web: step one day at a time. */
export function DateStepper({ value, onChange, maxDate }: DateStepperProps) {
  const styles = useStyles();
  const canGoForward = value < maxDate;
  const relative = relativeLabel(value, maxDate);

  return (
    <View style={styles.row}>
      <StepButton label="‹" accessibilityLabel="Previous day" onPress={() => onChange(addDays(value, -1))} />
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Text style={styles.date}>{formatLongDate(value)}</Text>
        {relative ? <Text style={styles.relative}>{relative}</Text> : null}
      </View>
      <StepButton
        label="›"
        accessibilityLabel="Next day"
        disabled={!canGoForward}
        onPress={() => onChange(addDays(value, 1))}
      />
    </View>
  );
}

interface StepButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

function StepButton({ label, accessibilityLabel, onPress, disabled = false }: StepButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.step, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      padding: spacing.xs,
    },
    center: { flex: 1, alignItems: 'center' },
    date: { fontSize: 15, fontWeight: '600', color: colors.text },
    relative: { fontSize: 12, color: colors.textMuted },
    step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    pressed: { backgroundColor: colors.surfaceMuted },
    disabled: { opacity: 0.3 },
    stepText: { fontSize: 24, color: colors.text, lineHeight: 28 },
  }),
);
