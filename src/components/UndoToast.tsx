import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import { makeStyles } from '../theme/useTheme';

const AUTO_DISMISS_MS = 5000;

interface UndoToastProps {
  /** A new key restarts the auto-dismiss timer (e.g. the deleted transaction's id). */
  toastKey: string | null;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  bottomOffset: number;
}

export function UndoToast({ toastKey, message, onUndo, onDismiss, bottomOffset }: UndoToastProps) {
  const styles = useStyles();
  useEffect(() => {
    if (!toastKey) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toastKey, onDismiss]);

  if (!toastKey) return null;

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <Pressable onPress={onUndo} hitSlop={10} accessibilityRole="button" accessibilityLabel="Undo delete">
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      pointerEvents: 'box-none',
    },
    toast: {
      width: '100%',
      maxWidth: 512,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.inverseSurface,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 8,
    },
    message: { flex: 1, color: colors.onInverse, fontSize: 14 },
    undo: { color: colors.inverseAccent, fontSize: 15, fontWeight: '700' },
  }),
);
