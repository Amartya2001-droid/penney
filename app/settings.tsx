import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetForm } from '../src/components/BudgetForm';
import { Button } from '../src/components/Button';
import { CategoryBudgetForm } from '../src/components/CategoryBudgetForm';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { NoticeBanner } from '../src/components/NoticeBanner';
import { ReminderSettings } from '../src/components/ReminderSettings';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SegmentedToggle, type SegmentOption } from '../src/components/SegmentedToggle';
import { aiConfig } from '../src/config/aiConfig';
import { DEMO_ENABLED } from '../src/config/demoConfig';
import { radius, spacing, type AppearancePreference } from '../src/constants/theme';
import { useTodayKey } from '../src/hooks/useTodayKey';
import { usePenneyStore } from '../src/store/usePenneyStore';
import { buildExport, shareExport } from '../src/utils/exportData';
import { makeStyles } from '../src/theme/useTheme';

type Notice = { tone: 'success' | 'danger'; message: string } | null;

const APPEARANCE_OPTIONS: readonly SegmentOption<AppearancePreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const todayKey = useTodayKey();
  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const commentaryLog = usePenneyStore((s) => s.commentaryLog);
  const categoryBudgets = usePenneyStore((s) => s.categoryBudgets);
  const resetAll = usePenneyStore((s) => s.resetAll);
  const appearance = usePenneyStore((s) => s.appearance);
  const setAppearance = usePenneyStore((s) => s.setAppearance);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  if (!hasHydrated) return <LoadingScreen />;
  if (!budget) return <Redirect href="/onboarding" />;

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const exportData = async () => {
    setNotice(null);
    setExporting(true);
    try {
      const shared = await shareExport(buildExport(budget, transactions, commentaryLog, categoryBudgets));
      if (shared) setNotice({ tone: 'success', message: 'Backup created.' });
    } catch (e) {
      setNotice({
        tone: 'danger',
        message: `Couldn't create a backup${e instanceof Error && e.message ? `: ${e.message}` : '.'}`,
      });
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetAll();
    router.replace('/onboarding');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <ScreenHeader title="Settings" />

        <Section
          title="Monthly budget"
          description="Changes apply to the whole current month, including days that have already passed."
        >
          <BudgetForm initialBudget={budget} submitLabel="Save budget" />
        </Section>

        <Section
          title="Category limits"
          description="Optional monthly caps for discretionary categories. Leave a field blank for no limit. They're for planning; Penney's mood still follows your overall budget."
        >
          <CategoryBudgetForm todayKey={todayKey} />
        </Section>

        <Section title="Daily reminder">
          <ReminderSettings />
        </Section>

        <Section title="Appearance" description="System matches your device's light or dark setting.">
          <SegmentedToggle
            options={APPEARANCE_OPTIONS}
            value={appearance}
            onChange={setAppearance}
            accessibilityLabel="Appearance"
          />
        </Section>

        <Section title="Penney's commentary">
          <View style={styles.card}>
            <Text style={styles.cardStrong}>
              {aiConfig.enabled ? 'AI commentary is on' : 'Using built-in lines'}
            </Text>
            <Text style={styles.cardText}>
              {aiConfig.enabled
                ? `Penney writes one line a day with ${aiConfig.model}. To do that, your last 3 days of discretionary purchases, including their notes, are sent to the AI service. If it can't be reached, he uses his built-in lines.`
                : 'Penney is using his offline line bank. Nothing leaves this device. AI commentary can be turned on by the app developer.'}
            </Text>
          </View>
        </Section>

        <Section title="Your data" description="Your budget and expenses are stored only on this device.">
          {notice ? (
            <NoticeBanner tone={notice.tone} message={notice.message} onDismiss={() => setNotice(null)} />
          ) : null}
          <Button
            label={exporting ? 'Preparing backup…' : `Export backup (${transactions.length} expenses)`}
            variant="secondary"
            disabled={exporting}
            onPress={() => void exportData()}
          />
          {DEMO_ENABLED ? (
            <Button label="Load a demo preset" variant="secondary" onPress={() => router.push('/demo')} />
          ) : null}
          <Button
            label={confirmReset ? 'Tap again to erase everything' : 'Reset all data'}
            variant={confirmReset ? 'primary' : 'secondary'}
            onPress={reset}
          />
          {confirmReset ? (
            <Text style={styles.warning}>
              This deletes your budget, category limits, every expense, and Penney’s quotes. It can’t be undone.
            </Text>
          ) : null}
        </Section>

        <Text style={styles.about}>Penney v{version}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.xl,
      gap: spacing.xl,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    section: { gap: spacing.md },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionDescription: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: -spacing.sm },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    cardStrong: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardText: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
    warning: { fontSize: 13, color: colors.danger },
    about: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  }),
);
