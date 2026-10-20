import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  REMINDERS_SUPPORTED,
  installReminderHandler,
  onReminderOpened,
  syncReminders,
} from '../services/reminders/reminderScheduler';
import { useIntentStore } from '../store/useIntentStore';
import { usePenneyStore } from '../store/usePenneyStore';
import { useTodayKey } from './useTodayKey';

/**
 * Keeps scheduled reminders in step with the data: after loading, whenever the settings or
 * expenses change, at midnight, and each time the app returns to the foreground. Also opens
 * Add Expense when a reminder is tapped.
 */
export function useReminderSync(): void {
  const router = useRouter();
  const todayKey = useTodayKey();
  const hasHydrated = usePenneyStore((s) => s.hasHydrated);
  const reminder = usePenneyStore((s) => s.reminder);
  const transactions = usePenneyStore((s) => s.transactions);

  useEffect(() => {
    if (!REMINDERS_SUPPORTED || !hasHydrated) return;
    void syncReminders(reminder, transactions);
  }, [hasHydrated, reminder, transactions, todayKey]);

  useEffect(() => {
    if (!REMINDERS_SUPPORTED) return;
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      const state = usePenneyStore.getState();
      if (state.hasHydrated) void syncReminders(state.reminder, state.transactions);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!REMINDERS_SUPPORTED) return;
    installReminderHandler();
    return onReminderOpened(() => {
      // The dashboard opens Add Expense when it sees the request. On a cold start the app is
      // already heading there; otherwise go back to it from wherever the user was.
      useIntentStore.getState().requestAddExpense();
      try {
        router.dismissTo('/');
      } catch {
        // Navigator not mounted yet (launching from the tap): the dashboard is the first screen anyway.
      }
    });
  }, [router]);
}
