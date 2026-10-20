import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Transaction } from '../../types';
import { toDateKey } from '../../utils/dates';
import { hasLoggedOn, planReminderDates, reminderLine, type ReminderSettings } from '../../utils/reminders';

/** Local notifications aren't available in the web build. */
export const REMINDERS_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

const CHANNEL_ID = 'reminders';
/** Tags our notifications so we only ever cancel Penney's own reminders. */
export const REMINDER_KIND = 'penney-log-reminder';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!REMINDERS_SUPPORTED) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as ReminderPermission;
}

/** Asks for permission if it hasn't been decided yet. Resolves true when reminders can be shown. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!REMINDERS_SUPPORTED) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

let handlerInstalled = false;

/** Shows reminders as a banner even while the app is open. Safe to call more than once. */
export function installReminderHandler(): void {
  if (!REMINDERS_SUPPORTED || handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function cancelPenneyReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === REMINDER_KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function scheduleAll(
  settings: ReminderSettings,
  transactions: Transaction[],
  now: Date,
): Promise<Date[]> {
  await cancelPenneyReminders();
  if (!settings.enabled) return [];
  if ((await getReminderPermission()) !== 'granted') return [];

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reminders',
      description: 'A nudge to log your spending on days you haven’t yet.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const dates = planReminderDates(settings, now, hasLoggedOn(transactions, toDateKey(now)));
  for (const date of dates) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Penney',
        body: reminderLine(toDateKey(date)),
        data: { kind: REMINDER_KIND },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
  return dates;
}

/**
 * Calls `onOpen` when someone taps one of Penney's reminders, including the tap that launched
 * the app from closed. Returns an unsubscribe function.
 */
export function onReminderOpened(onOpen: () => void): () => void {
  if (!REMINDERS_SUPPORTED) return () => undefined;
  let lastHandled: string | null = null;

  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const { identifier, content } = response.notification.request;
    if (content.data?.kind !== REMINDER_KIND || identifier === lastHandled) return;
    lastHandled = identifier;
    // Clear it so a later launch doesn't reopen Add Expense for the same old tap.
    Notifications.clearLastNotificationResponse();
    onOpen();
  };

  void Notifications.getLastNotificationResponseAsync().then(handle);
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Replaces Penney's scheduled reminders with a fresh plan. Calls are queued, so overlapping
 * syncs (a new expense while the app comes to the foreground) can't double-schedule.
 * Resolves with the times scheduled; never rejects.
 */
export function syncReminders(
  settings: ReminderSettings,
  transactions: Transaction[],
  now: Date = new Date(),
): Promise<Date[]> {
  if (!REMINDERS_SUPPORTED) return Promise.resolve([]);
  const run = queue.then(() => scheduleAll(settings, transactions, now));
  queue = run.catch(() => undefined);
  return run.catch((e: unknown) => {
    console.warn('[Penney] Could not schedule reminders:', e);
    return [];
  });
}
