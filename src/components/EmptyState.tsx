import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { MoodState } from '../types';
import { Button } from './Button';
import { PenneyCharacter } from './PenneyCharacter';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Show a small Penney above the text. */
  showPenney?: boolean;
}

export function EmptyState({ title, message, actionLabel, onAction, showPenney = true }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {showPenney ? <PenneyCharacter mood={MoodState.Neutral} size={64} /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: spacing.xs },
  message: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  action: { marginTop: spacing.sm },
});
