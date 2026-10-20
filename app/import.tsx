import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { NoticeBanner } from '../src/components/NoticeBanner';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SegmentedToggle, type SegmentOption } from '../src/components/SegmentedToggle';
import { radius, spacing } from '../src/constants/theme';
import { pickBackupFile } from '../src/services/backup/pickBackupFile';
import { usePenneyStore } from '../src/store/usePenneyStore';
import { makeStyles, useTheme } from '../src/theme/useTheme';
import { dateFromKey } from '../src/utils/dates';
import { buildExport, shareExport } from '../src/utils/exportData';
import { parseBackup, planMerge, type BackupData, type ParsedBackup } from '../src/utils/importBackup';
import { formatCurrency } from '../src/utils/money';

/** "Oct 1, 2026": short enough for a date range on one line, with the year since backups can be old. */
const withYear = (date: Date) => date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

type Mode = 'replace' | 'merge';

const MODE_OPTIONS: readonly SegmentOption<Mode>[] = [
  { value: 'replace', label: 'Replace my data' },
  { value: 'merge', label: 'Add missing expenses' },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Step =
  | { name: 'choose' }
  | { name: 'preview'; backup: ParsedBackup }
  | { name: 'done'; message: string; undo: BackupData | null };

export default function ImportScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const budget = usePenneyStore((s) => s.budget);
  const transactions = usePenneyStore((s) => s.transactions);
  const commentaryLog = usePenneyStore((s) => s.commentaryLog);
  const categoryBudgets = usePenneyStore((s) => s.categoryBudgets);
  const replaceAllData = usePenneyStore((s) => s.replaceAllData);
  const addTransactions = usePenneyStore((s) => s.addTransactions);

  const [step, setStep] = useState<Step>({ name: 'choose' });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('replace');
  const [confirming, setConfirming] = useState(false);

  const hasCurrentData = budget !== null || transactions.length > 0;
  const backup = step.name === 'preview' ? step.backup : null;
  const merge = useMemo(
    () => (backup ? planMerge(transactions, backup.data.transactions) : null),
    [backup, transactions],
  );

  if (!hasHydrated) return <LoadingScreen />;

  const read = (text: string) => {
    const result = parseBackup(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setConfirming(false);
    // Replace can't work without a budget in the backup; merging needs a budget already here.
    setMode(result.backup.data.budget === null ? 'merge' : 'replace');
    setStep({ name: 'preview', backup: result.backup });
  };

  const chooseFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const text = await pickBackupFile();
      if (text !== null) read(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that file.");
    } finally {
      setBusy(false);
    }
  };

  const exportFirst = async () => {
    try {
      await shareExport(buildExport(budget, transactions, commentaryLog, categoryBudgets));
    } catch (e) {
      setError(`Couldn't create a backup${e instanceof Error && e.message ? `: ${e.message}` : '.'}`);
    }
  };

  const apply = () => {
    if (!backup || !merge) return;
    const before: BackupData = { budget, transactions, commentaryLog, categoryBudgets };
    try {
      if (mode === 'replace') {
        if (hasCurrentData && !confirming) {
          setConfirming(true);
          return;
        }
        replaceAllData(backup.data);
        setStep({
          name: 'done',
          message: `Restored ${plural(backup.data.transactions.length, 'expense')} and your budget from the backup.`,
          undo: hasCurrentData ? before : null,
        });
      } else {
        const added = addTransactions(merge.toAdd);
        setStep({
          name: 'done',
          message:
            added === 0
              ? 'Nothing new to add. Every expense in the backup is already here.'
              : `Added ${plural(added, 'expense')} from the backup.`,
          undo: added > 0 ? before : null,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import that backup.");
    }
  };

  const undo = (snapshot: BackupData) => {
    replaceAllData(snapshot);
    setStep({ name: 'done', message: 'Import undone. Your data is back to how it was.', undo: null });
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
        <ScreenHeader
          title="Restore from backup"
          subtitle="Use a backup made with Export backup in Settings, on this device or another one."
        />

        {error ? <NoticeBanner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}

        {step.name === 'choose' ? (
          <View style={styles.group}>
            <Button
              label={busy ? 'Opening…' : 'Choose a backup file'}
              onPress={() => void chooseFile()}
              disabled={busy}
            />
            <Button
              label={pasteOpen ? 'Hide pasted text' : 'Paste backup text instead'}
              variant="secondary"
              onPress={() => setPasteOpen((v) => !v)}
            />
            {pasteOpen ? (
              <View style={styles.group}>
                <Text style={styles.hint}>
                  On iPhone and Android, Export backup shares the backup as text. Paste all of it here.
                </Text>
                <TextInput
                  style={styles.paste}
                  value={pasted}
                  onChangeText={(t) => {
                    setPasted(t);
                    setError(null);
                  }}
                  multiline
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder='{ "app": "penney", … }'
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Backup text"
                />
                <Button label="Read backup" variant="secondary" onPress={() => read(pasted)} disabled={!pasted.trim()} />
              </View>
            ) : null}
          </View>
        ) : null}

        {step.name === 'preview' && backup && merge ? (
          <View style={styles.group}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>In this backup</Text>
              {backup.exportedAt && !Number.isNaN(Date.parse(backup.exportedAt)) ? (
                <Row label="Made on" value={withYear(new Date(backup.exportedAt))} />
              ) : null}
              <Row
                label="Budget"
                value={
                  backup.data.budget
                    ? `${formatCurrency(backup.data.budget.monthly_income)} income, saving ${formatCurrency(backup.data.budget.savings_goal)}`
                    : 'None'
                }
              />
              <Row
                label="Expenses"
                value={
                  backup.firstDate && backup.lastDate
                    ? `${backup.data.transactions.length} (${withYear(dateFromKey(backup.firstDate))} to ${withYear(dateFromKey(backup.lastDate))})`
                    : '0'
                }
              />
              <Row label="Category limits" value={String(Object.keys(backup.data.categoryBudgets).length)} />
              <Row label="Penney's quotes" value={String(backup.data.commentaryLog.length)} />
            </View>

            {backup.skipped > 0 ? (
              <NoticeBanner
                tone="warning"
                message={`${plural(backup.skipped, 'record was', 'records were')} unreadable and will be left out.`}
              />
            ) : null}

            {budget !== null && backup.data.budget !== null ? (
              <SegmentedToggle
                options={MODE_OPTIONS}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setConfirming(false);
                }}
                accessibilityLabel="How to import"
              />
            ) : null}

            <Text style={styles.explain}>
              {mode === 'replace'
                ? hasCurrentData
                  ? `Your budget, ${plural(transactions.length, 'expense')}, category limits, and quotes on this device will be replaced by the backup. Appearance and reminders stay as they are.`
                  : 'The backup becomes your data on this device.'
                : `${plural(merge.toAdd.length, 'new expense')} will be added${merge.alreadyHere > 0 ? `, and ${merge.alreadyHere} already here will be skipped` : ''}. Your budget and limits stay as they are.`}
            </Text>

            {mode === 'replace' && hasCurrentData ? (
              <Button label="Export my current data first" variant="ghost" onPress={() => void exportFirst()} />
            ) : null}

            <Button
              label={
                mode === 'merge'
                  ? merge.toAdd.length > 0
                    ? `Add ${plural(merge.toAdd.length, 'expense')}`
                    : 'Nothing new to add'
                  : confirming
                    ? 'Tap again to replace everything'
                    : hasCurrentData
                      ? 'Replace my data'
                      : 'Restore this backup'
              }
              onPress={apply}
              disabled={mode === 'merge' && merge.toAdd.length === 0}
            />
            <Button
              label="Choose a different backup"
              variant="secondary"
              onPress={() => {
                setStep({ name: 'choose' });
                setConfirming(false);
              }}
            />
          </View>
        ) : null}

        {step.name === 'done' ? (
          <View style={styles.group}>
            <NoticeBanner tone="success" message={step.message} />
            {step.undo ? (
              <Button label="Undo import" variant="secondary" onPress={() => step.undo && undo(step.undo)} />
            ) : null}
            <Button
              label="Go to the dashboard"
              onPress={() => router.replace(usePenneyStore.getState().budget ? '/' : '/onboarding')}
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
    group: { gap: spacing.md },
    hint: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
    paste: {
      minHeight: 140,
      maxHeight: 260,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      padding: spacing.md,
      fontSize: 13,
      color: colors.text,
      textAlignVertical: 'top',
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    rowLabel: { fontSize: 14, color: colors.textMuted },
    rowValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
    explain: { fontSize: 14, lineHeight: 20, color: colors.text },
  }),
);
