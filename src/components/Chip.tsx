import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, spacing } from '../constants/theme';
import { makeStyles } from '../theme/useTheme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    pressed: { opacity: 0.8 },
    text: { fontSize: 14, color: colors.text, fontWeight: '500' },
    selectedText: { color: colors.onPrimary },
  }),
);
