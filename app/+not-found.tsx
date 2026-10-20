import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { PenneyCharacter } from '../src/components/PenneyCharacter';
import { colors, spacing } from '../src/constants/theme';
import { MoodState } from '../src/types';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <PenneyCharacter mood={MoodState.Concerned} size={96} />
      <Text style={styles.title}>Nothing here</Text>
      <Text style={styles.message}>This page doesn’t exist. Penney checked twice.</Text>
      <Button label="Back to Penney" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  message: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
});
