import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { Button } from './Button';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button that returns to the previous screen, or the dashboard if there is none. */
  showBack?: boolean;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, showBack = true, right }: ScreenHeaderProps) {
  const router = useRouter();
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? <Button label="‹ Back" variant="ghost" onPress={back} style={styles.back} /> : null}
        <View style={styles.spacer} />
        {right}
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm },
  back: { paddingHorizontal: 0 },
  spacer: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
});
