import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

type Tone = 'info' | 'warning' | 'danger' | 'success';

const TONE_STYLES: Record<Tone, { background: string; border: string; text: string }> = {
  info: { background: '#E8EFF6', border: '#C6D6E7', text: colors.info },
  warning: { background: '#FBF1DF', border: '#EED6A8', text: '#8A5A12' },
  danger: { background: '#FBE7E5', border: '#F1C3BE', text: colors.danger },
  success: { background: '#E5F2EA', border: '#BFDDCA', text: colors.success },
};

interface NoticeBannerProps {
  message: string;
  tone?: Tone;
  onDismiss?: () => void;
}

export function NoticeBanner({ message, tone = 'info', onDismiss }: NoticeBannerProps) {
  const palette = TONE_STYLES[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: palette.background, borderColor: palette.border }]}
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
    >
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Text style={[styles.dismiss, { color: palette.text }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
