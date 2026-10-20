import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, toneColors, type Tone } from '../constants/theme';
import { makeStyles, useTheme } from '../theme/useTheme';

interface NoticeBannerProps {
  message: string;
  tone?: Tone;
  onDismiss?: () => void;
}

export function NoticeBanner({ message, tone = 'info', onDismiss }: NoticeBannerProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = toneColors(colors, tone);
  return (
    <View
      style={[styles.banner, { backgroundColor: palette.soft, borderColor: palette.border }]}
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
    >
      <Text style={[styles.message, { color: palette.fg }]}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Text style={[styles.dismiss, { color: palette.fg }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    message: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
    dismiss: { fontSize: 14, fontWeight: '700' },
  }),
);
