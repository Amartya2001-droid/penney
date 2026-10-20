import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { PenneyCharacter } from '../src/components/PenneyCharacter';
import { MOOD_VISUALS, PACE_VISUALS } from '../src/constants/moods';
import { colors, radius, spacing } from '../src/constants/theme';
import { loadDemoPreset, resetToEmpty } from '../src/demo/loadDemoPreset';
import { DEMO_PRESETS, previewDemoPreset, type DemoPresetId } from '../src/demo/presets';
import { usePenneyStore } from '../src/store/usePenneyStore';
import type { MonthSnapshot } from '../src/types';
import { dateFromKey, toDateKey } from '../src/utils/dates';
import { formatCurrency } from '../src/utils/money';

type PendingAction = DemoPresetId | 'reset' | null;

function describePace(snapshot: MonthSnapshot): string {
  const pct = snapshot.pace.percentOffPace;
  const label = PACE_VISUALS[snapshot.pace.status].label;
  if (pct === null || Math.round(Math.abs(pct)) === 0) return label;
  return `${label} · ${Math.round(Math.abs(pct))}% ${pct < 0 ? 'under' : 'over'}`;
}

export default function DemoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hasData = usePenneyStore((s) => s.budget !== null || s.transactions.length > 0);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());
  const previews = useMemo(() => {
    const refDate = dateFromKey(todayKey);
    return DEMO_PRESETS.map((preset) => ({ preset, snapshot: previewDemoPreset(preset.id, refDate) }));
  }, [todayKey]);

  const goToDashboard = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  /** Asks for a second tap before overwriting existing data (works on web, unlike Alert). */
  const confirmThen = (action: Exclude<PendingAction, null>, run: () => void) => {
    setError(null);
    if (hasData && pending !== action) {
      setPending(action);
      return;
    }
    setPending(null);
    try {
      run();
      goToDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Demo presets</Text>
        <Button label="Close" variant="ghost" onPress={close} />
      </View>
      <Text style={styles.subtitle}>
        Each preset loads a sample budget plus this month’s transactions, dated relative to today, so
        Penney’s mood and quote change immediately.
        {hasData ? ' Loading one replaces your current budget and expenses.' : ''}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {previews.map(({ preset, snapshot }) => {
        const mood = MOOD_VISUALS[snapshot.mood];
        const isPending = pending === preset.id;
        return (
          <View key={preset.id} style={styles.card}>
            <View style={styles.cardTop}>
              <PenneyCharacter mood={snapshot.mood} size={64} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{preset.title}</Text>
                <Text style={[styles.mood, { color: mood.accent }]}>{mood.label}</Text>
                <Text style={styles.meta}>{describePace(snapshot)}</Text>
              </View>
            </View>
            <Text style={styles.tagline}>{preset.tagline}</Text>
            <Text style={styles.meta}>
              Per day, rest of month: {formatCurrency(snapshot.target.remainingDailyTarget)}
              {snapshot.target.unplannedEssentialTotal > 0
                ? ` · ${formatCurrency(snapshot.target.unplannedEssentialTotal)} unplanned essential`
                : ''}
            </Text>
            <Button
              label={isPending ? 'Tap again to replace your data' : `Load "${preset.title}"`}
              variant={isPending ? 'primary' : 'secondary'}
              onPress={() => confirmThen(preset.id, () => loadDemoPreset(preset.id))}
            />
          </View>
        );
      })}

      <View style={styles.resetCard}>
        <Text style={styles.cardTitle}>Start over</Text>
        <Text style={styles.meta}>Clears the budget, every expense, and Penney’s quotes.</Text>
        <Button
          label={pending === 'reset' ? 'Tap again to erase everything' : 'Reset to empty'}
          variant={pending === 'reset' ? 'primary' : 'secondary'}
          disabled={!hasData}
          onPress={() => confirmThen('reset', resetToEmpty)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  mood: { fontSize: 14, fontWeight: '700' },
  tagline: { fontSize: 14, lineHeight: 20, color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  resetCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
