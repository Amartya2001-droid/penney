import { Redirect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetForm } from '../src/components/BudgetForm';
import { Button } from '../src/components/Button';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { PenneyCharacter } from '../src/components/PenneyCharacter';
import { DEMO_ENABLED } from '../src/config/demoConfig';
import { spacing } from '../src/constants/theme';
import { usePenneyStore } from '../src/store/usePenneyStore';
import { MoodState } from '../src/types';
import { makeStyles } from '../src/theme/useTheme';

/** First-run setup. Once a budget exists, it's edited from Settings instead. */
export default function OnboardingScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);

  if (!hasHydrated) return <LoadingScreen />;
  if (budget) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.hero}>
          <PenneyCharacter mood={MoodState.Thriving} size={112} />
          <Text style={styles.title} accessibilityRole="header">
            Meet Penney
          </Text>
          <Text style={styles.subtitle}>
            A coin with opinions about your takeout. Set your monthly budget and Penney will keep an eye on
            discretionary spending. Rent and groceries are already accounted for, so he won’t comment on them.
          </Text>
        </View>

        <BudgetForm initialBudget={null} submitLabel="Let's go" onSaved={() => router.replace('/')} />

        <Button label="Have a backup? Restore it" variant="ghost" onPress={() => router.push('/import')} />
        {DEMO_ENABLED ? (
          <Button label="Just looking? Try a demo preset" variant="ghost" onPress={() => router.push('/demo')} />
        ) : null}
        <Text style={styles.privacy}>Your budget and expenses stay on this device.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    hero: { alignItems: 'center', gap: spacing.sm },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
    subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
    privacy: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  }),
);
