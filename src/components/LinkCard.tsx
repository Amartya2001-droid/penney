import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import { makeStyles } from '../theme/useTheme';

interface LinkCardProps {
  title: string;
  detail: string;
  onPress: () => void;
}

/** A tappable row that leads to another screen. */
export function LinkCard({ title, detail, onPress }: LinkCardProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
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
    text: { flex: 1, gap: 2 },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    detail: { fontSize: 12, color: colors.textMuted },
    chevron: { fontSize: 22, color: colors.textMuted },
  }),
);
