import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { usePenneyStore } from '../store/usePenneyStore';
import { MoodState } from '../types';
import { Button } from './Button';
import { PenneyCharacter } from './PenneyCharacter';

interface AppErrorFallbackProps {
  error: Error;
  retry: () => Promise<void> | void;
}

/** Shown by the root error boundary instead of a blank screen when a render crashes. */
export function AppErrorFallback({ error, retry }: AppErrorFallbackProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const resetData = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    usePenneyStore.getState().resetAll();
    void retry();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PenneyCharacter mood={MoodState.DeadpanDisappointed} size={96} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        Penney tripped over his own edge. Your saved data hasn’t been touched. Try again first.
      </Text>

      <View style={styles.actions}>
        <Button label="Try again" onPress={() => void retry()} />
        <Button
          label={confirmReset ? 'Tap again to erase all data' : 'Reset app data'}
          variant="secondary"
          onPress={resetData}
        />
        <Button
          label={showDetails ? 'Hide details' : 'Show details'}
          variant="ghost"
          onPress={() => setShowDetails((v) => !v)}
        />
      </View>

      {showDetails ? (
        <View style={styles.details}>
          <Text style={styles.detailsText} selectable>
            {error.name}: {error.message}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  message: { fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  details: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  detailsText: { fontSize: 12, color: colors.text, fontFamily: 'monospace' },
});
