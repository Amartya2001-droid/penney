import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import { makeStyles } from '../theme/useTheme';

interface PeriodSwitcherProps {
  label: string;
  /** Spoken names for the arrows, e.g. "Previous week". */
  previousLabel: string;
  nextLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

/** "‹ Oct 19 – 25 ›" control for stepping between weeks or months. */
export function PeriodSwitcher({
  label,
  previousLabel,
  nextLabel,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: PeriodSwitcherProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Arrow glyph="‹" accessibilityLabel={previousLabel} disabled={!canGoPrevious} onPress={onPrevious} />
      <Text style={styles.label} accessibilityLiveRegion="polite">
        {label}
      </Text>
      <Arrow glyph="›" accessibilityLabel={nextLabel} disabled={!canGoNext} onPress={onNext} />
    </View>
  );
}

interface ArrowProps {
  glyph: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

function Arrow({ glyph, accessibilityLabel, disabled, onPress }: ArrowProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xs,
    },
    label: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
    arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    pressed: { backgroundColor: colors.surfaceMuted },
    disabled: { opacity: 0.3 },
    glyph: { fontSize: 24, color: colors.text, lineHeight: 28 },
  }),
);
