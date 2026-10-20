import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import {
  REMINDERS_SUPPORTED,
  getReminderPermission,
  requestReminderPermission,
  type ReminderPermission,
} from '../services/reminders/reminderScheduler';
import { usePenneyStore } from '../store/usePenneyStore';
import { toDateKey } from '../utils/dates';
import { formatLongDate } from '../utils/formatDate';
import {
  REMINDER_STEP_MINUTES,
  formatReminderTime,
  hasLoggedOn,
  planReminderDates,
  shiftReminderTime,
} from '../utils/reminders';
import { PeriodSwitcher } from './PeriodSwitcher';
import { makeStyles, useTheme } from '../theme/useTheme';

/** Settings card: turn the daily logging reminder on or off and pick its time. */
export function ReminderSettings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const reminder = usePenneyStore((s) => s.reminder);
  const transactions = usePenneyStore((s) => s.transactions);
  const setReminder = usePenneyStore((s) => s.setReminder);
  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (REMINDERS_SUPPORTED) void getReminderPermission().then(setPermission);
  }, []);

  if (!REMINDERS_SUPPORTED) {
    return (
      <View style={styles.card}>
        <Text style={styles.text}>
          Reminders work in the iOS and Android apps. Browsers can’t schedule them for Penney.
        </Text>
      </View>
    );
  }

  const toggle = async (on: boolean) => {
    if (!on) {
      setReminder({ enabled: false });
      return;
    }
    setBusy(true);
    try {
      const granted = await requestReminderPermission();
      setPermission(granted ? 'granted' : 'denied');
      if (granted) setReminder({ enabled: true });
    } finally {
      setBusy(false);
    }
  };

  const time = formatReminderTime(reminder.hour, reminder.minute);
  const now = new Date();
  const next = planReminderDates(reminder, now, hasLoggedOn(transactions, toDateKey(now)), 2)[0];
  const blocked = permission === 'denied';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.strong}>Remind me to log</Text>
          <Text style={styles.text}>Only on days you haven’t logged anything yet.</Text>
        </View>
        <Switch
          value={reminder.enabled}
          onValueChange={(on) => void toggle(on)}
          disabled={busy}
          trackColor={{ false: colors.surfaceMuted, true: colors.success }}
          thumbColor={colors.surfaceRaised}
          ios_backgroundColor={colors.surfaceMuted}
          accessibilityLabel="Daily reminder to log expenses"
        />
      </View>

      <PeriodSwitcher
        label={time}
        previousLabel={`${REMINDER_STEP_MINUTES} minutes earlier`}
        nextLabel={`${REMINDER_STEP_MINUTES} minutes later`}
        canGoPrevious
        canGoNext
        onPrevious={() => setReminder(shiftReminderTime(reminder, -1))}
        onNext={() => setReminder(shiftReminderTime(reminder, 1))}
      />

      {blocked ? (
        <Text style={styles.warning}>
          Notifications are off for Penney. Turn them on in your phone’s Settings, then switch this on again.
        </Text>
      ) : reminder.enabled && next ? (
        <Text style={styles.text}>
          Next reminder: {toDateKey(next) === toDateKey(now) ? 'today' : formatLongDate(toDateKey(next))} at{' '}
          {time}.
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1, gap: 2 },
    strong: { fontSize: 15, fontWeight: '700', color: colors.text },
    text: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
    warning: { fontSize: 14, lineHeight: 20, color: colors.warning },
  }),
);
