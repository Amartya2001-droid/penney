/**
 * Web build: browsers can't schedule Penney's local reminders, and importing expo-notifications
 * there only adds warnings, so Metro picks this stub instead. Same exports as the native file.
 */
import type { Transaction } from '../../types';
import type { ReminderSettings } from '../../utils/reminders';

export const REMINDERS_SUPPORTED = false;
export const REMINDER_KIND = 'penney-log-reminder';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export async function getReminderPermission(): Promise<ReminderPermission> {
  return 'denied';
}

export async function requestReminderPermission(): Promise<boolean> {
  return false;
}

export function installReminderHandler(): void {}

export function onReminderOpened(_onOpen: () => void): () => void {
  return () => undefined;
}

export function syncReminders(
  _settings: ReminderSettings,
  _transactions: Transaction[],
  _now?: Date,
): Promise<Date[]> {
  return Promise.resolve([]);
}
