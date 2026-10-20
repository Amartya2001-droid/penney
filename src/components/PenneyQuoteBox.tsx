import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import type { PenneyCommentary } from '../types';
import { makeStyles } from '../theme/useTheme';

const TAIL_SIZE = 18;

interface PenneyQuoteBoxProps {
  commentary: PenneyCommentary | null;
}

export function PenneyQuoteBox({ commentary }: PenneyQuoteBoxProps) {
  const styles = useStyles();
  const message = commentary?.message ?? null;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.bubble}
        accessible
        accessibilityLabel={message ? `Penney says: ${message}` : 'Penney is thinking'}
      >
        <Text style={styles.name}>Penney says</Text>
        <Text style={styles.message}>
          {message ? `“${message}”` : 'Thinking of something dry to say…'}
        </Text>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    wrap: { marginTop: TAIL_SIZE / 2 },
    bubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    tail: {
      position: 'absolute',
      top: -TAIL_SIZE / 2,
      left: '50%',
      marginLeft: -TAIL_SIZE / 2,
      width: TAIL_SIZE,
      height: TAIL_SIZE,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderColor: colors.border,
      transform: [{ rotate: '45deg' }],
    },
    name: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    message: { fontSize: 17, lineHeight: 24, color: colors.text, fontStyle: 'italic' },
  }),
);
