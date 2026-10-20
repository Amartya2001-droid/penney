import { Category, type Transaction } from '../types';
import {
  DEFAULT_REMINDER,
  REMINDER_DAYS_AHEAD,
  REMINDER_LINES,
  formatReminderTime,
  hasLoggedOn,
  isReminderSettings,
  planReminderDates,
  reminderLine,
  shiftReminderTime,
} from '../utils/reminders';
import { REMINDER_KIND, onReminderOpened, syncReminders } from '../services/reminders/reminderScheduler';
import { useIntentStore } from '../store/useIntentStore';
import { sanitizePersistedState } from '../store/sanitizePersisted';

// A fake notification centre: just enough of expo-notifications for the scheduler.
// babel-jest hoists jest.mock above the imports; `mock`-prefixed names may be used inside it.
const mockScheduled: { identifier: string; content: { data?: Record<string, unknown> }; trigger: unknown }[] = [];
let mockPermission = 'granted';
let mockNextId = 0;
// Tap handling: the response that launched the app, and the live listener.
let mockLastResponse: unknown = null;
let mockResponseListener: ((response: unknown) => void) | null = null;
const mockClearLast = jest.fn();
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => ({ status: mockPermission, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: mockPermission })),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(async () => mockLastResponse),
  clearLastNotificationResponse: () => mockClearLast(),
  addNotificationResponseReceivedListener: jest.fn((listener: (response: unknown) => void) => {
    mockResponseListener = listener;
    return { remove: () => (mockResponseListener = null) };
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockScheduled]),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    const i = mockScheduled.findIndex((n) => n.identifier === id);
    if (i >= 0) mockScheduled.splice(i, 1);
  }),
  scheduleNotificationAsync: jest.fn(async (request: { content: { data?: Record<string, unknown> }; trigger: unknown }) => {
    const identifier = `n${++mockNextId}`;
    mockScheduled.push({ identifier, ...request });
    return identifier;
  }),
}));

function t(date: string, createdAt = `${date}T12:00:00`): Transaction {
  return {
    id: `${date}-${createdAt}`,
    amount: 10,
    category: Category.Takeout,
    date,
    is_essential: false,
    description: '',
    created_at: new Date(createdAt).toISOString(),
  };
}

const ON = { enabled: true, hour: 20, minute: 0 };
const at = (key: string, h: number, m = 0) => {
  const d = new Date(`${key}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
};

describe('planReminderDates', () => {
  it('plans nothing when reminders are off', () => {
    expect(planReminderDates(DEFAULT_REMINDER, at('2026-10-20', 9), false)).toEqual([]);
  });

  it('includes today when nothing is logged and the time is still ahead', () => {
    const dates = planReminderDates(ON, at('2026-10-20', 9), false);
    expect(dates).toHaveLength(REMINDER_DAYS_AHEAD);
    expect(dates[0]).toEqual(at('2026-10-20', 20));
    expect(dates[dates.length - 1]).toEqual(at('2026-11-02', 20));
  });

  it('skips today once something is logged', () => {
    const dates = planReminderDates(ON, at('2026-10-20', 9), true);
    expect(dates).toHaveLength(REMINDER_DAYS_AHEAD - 1);
    expect(dates[0]).toEqual(at('2026-10-21', 20));
  });

  it('skips today once the time has passed', () => {
    expect(planReminderDates(ON, at('2026-10-20', 20, 0), false)[0]).toEqual(at('2026-10-21', 20));
  });

  it('keeps the local time across a daylight-saving change', () => {
    // Nova Scotia falls back on Nov 1, 2026; reminders stay at 8 PM local either side.
    const dates = planReminderDates(ON, at('2026-10-30', 9), false);
    expect(dates.every((d) => d.getHours() === 20 && d.getMinutes() === 0)).toBe(true);
  });
});

describe('reminder helpers', () => {
  it('formats times in 12-hour form', () => {
    expect(formatReminderTime(20, 0)).toBe('8:00 PM');
    expect(formatReminderTime(0, 30)).toBe('12:30 AM');
    expect(formatReminderTime(12, 5)).toBe('12:05 PM');
  });

  it('steps the time and wraps around midnight', () => {
    expect(shiftReminderTime(ON, 1)).toMatchObject({ hour: 20, minute: 30 });
    expect(shiftReminderTime({ ...ON, hour: 23, minute: 30 }, 1)).toMatchObject({ hour: 0, minute: 0 });
    expect(shiftReminderTime({ ...ON, hour: 0, minute: 0 }, -1)).toMatchObject({ hour: 23, minute: 30 });
  });

  it('counts an expense dated today, or logged today for an earlier date', () => {
    expect(hasLoggedOn([t('2026-10-20')], '2026-10-20')).toBe(true);
    expect(hasLoggedOn([t('2026-10-18', '2026-10-20T09:00:00')], '2026-10-20')).toBe(true);
    expect(hasLoggedOn([t('2026-10-19')], '2026-10-20')).toBe(false);
  });

  it('validates settings', () => {
    expect(isReminderSettings(ON)).toBe(true);
    expect(isReminderSettings({ ...ON, hour: 24 })).toBe(false);
    expect(isReminderSettings({ ...ON, minute: 1.5 })).toBe(false);
    expect(isReminderSettings({ hour: 8, minute: 0 })).toBe(false);
  });

  it('picks a stable line for each day', () => {
    expect(reminderLine('2026-10-20')).toBe(reminderLine('2026-10-20'));
    expect(REMINDER_LINES).toContain(reminderLine('2026-10-21'));
  });

  it('loads saved reminder settings and defaults anything unreadable', () => {
    expect(sanitizePersistedState({ reminder: ON }).data.reminder).toEqual(ON);
    expect(sanitizePersistedState({ reminder: { enabled: 'yes' } }).data.reminder).toEqual(DEFAULT_REMINDER);
    expect(sanitizePersistedState({}).data.reminder).toEqual(DEFAULT_REMINDER);
  });
});

describe('syncReminders', () => {
  beforeEach(() => {
    mockScheduled.length = 0;
    mockPermission = 'granted';
  });

  it('schedules one tagged notification per planned day', async () => {
    const dates = await syncReminders(ON, [], at('2026-10-20', 9));
    expect(dates).toHaveLength(REMINDER_DAYS_AHEAD);
    expect(mockScheduled).toHaveLength(REMINDER_DAYS_AHEAD);
    expect(mockScheduled[0].content.data).toEqual({ kind: REMINDER_KIND });
    expect(mockScheduled[0].trigger).toMatchObject({ type: 'date', date: at('2026-10-20', 20) });
  });

  it('replaces only its own reminders and skips today after logging', async () => {
    mockScheduled.push({ identifier: 'other-app-thing', content: { data: { kind: 'something-else' } }, trigger: null });
    await syncReminders(ON, [], at('2026-10-20', 9));
    await syncReminders(ON, [t('2026-10-20')], at('2026-10-20', 9));
    const ours = mockScheduled.filter((n) => n.content.data?.kind === REMINDER_KIND);
    expect(ours).toHaveLength(REMINDER_DAYS_AHEAD - 1);
    expect(mockScheduled.some((n) => n.identifier === 'other-app-thing')).toBe(true);
  });

  it('clears everything when turned off, and schedules nothing without permission', async () => {
    await syncReminders(ON, [], at('2026-10-20', 9));
    await syncReminders({ ...ON, enabled: false }, [], at('2026-10-20', 9));
    expect(mockScheduled).toHaveLength(0);

    mockPermission = 'denied';
    expect(await syncReminders(ON, [], at('2026-10-20', 9))).toEqual([]);
    expect(mockScheduled).toHaveLength(0);
  });

  it('never double-schedules when syncs overlap', async () => {
    await Promise.all([
      syncReminders(ON, [], at('2026-10-20', 9)),
      syncReminders(ON, [], at('2026-10-20', 9)),
      syncReminders(ON, [], at('2026-10-20', 9)),
    ]);
    expect(mockScheduled).toHaveLength(REMINDER_DAYS_AHEAD);
  });
});

describe('tapping a reminder', () => {
  const tap = (identifier: string, kind: string) => ({
    notification: { request: { identifier, content: { data: { kind } } } },
  });

  it('handles the launch tap and later taps once each, ignoring other notifications', async () => {
    mockLastResponse = tap('launch', REMINDER_KIND);
    const onOpen = jest.fn();
    const unsubscribe = onReminderOpened(onOpen);
    await Promise.resolve();
    await Promise.resolve();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(mockClearLast).toHaveBeenCalledTimes(1);

    mockResponseListener?.(tap('launch', REMINDER_KIND)); // same tap reported again
    mockResponseListener?.(tap('other', 'something-else'));
    mockResponseListener?.(tap('later', REMINDER_KIND));
    expect(onOpen).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(mockResponseListener).toBeNull();
  });

  it('asks the dashboard to open Add Expense exactly once', () => {
    const intents = useIntentStore.getState();
    expect(useIntentStore.getState().addExpenseRequested).toBe(false);
    intents.requestAddExpense();
    expect(useIntentStore.getState().addExpenseRequested).toBe(true);
    intents.consumeAddExpense();
    expect(useIntentStore.getState().addExpenseRequested).toBe(false);
  });
});
