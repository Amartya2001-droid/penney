import type { MonthSnapshot, PenneyCommentaryContext, Transaction } from '../../types';
import { addDays } from '../../utils/dates';

const RECENT_WINDOW_DAYS = 3;
const MAX_RECENT_ITEMS = 5;

/** `transactions` are expected newest first, as the store keeps them. */
export function buildCommentaryContext(
  snapshot: MonthSnapshot,
  transactions: Transaction[],
  currency = 'CAD',
): PenneyCommentaryContext {
  const startKey = addDays(snapshot.dateKey, -(RECENT_WINDOW_DAYS - 1));

  const recentDiscretionary = transactions
    .filter((t) => !t.is_essential && t.date >= startKey && t.date <= snapshot.dateKey)
    .slice(0, MAX_RECENT_ITEMS)
    .map((t) => ({
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date,
    }));

  const { dayOfMonth, unplannedEvents } = snapshot.target;
  const hadUnplannedEssentialRecently = unplannedEvents.some(
    (event) => dayOfMonth - event.day < RECENT_WINDOW_DAYS,
  );

  return {
    dateKey: snapshot.dateKey,
    mood: snapshot.mood,
    paceStatus: snapshot.pace.status,
    percentOffPace: snapshot.pace.percentOffPace,
    remainingDailyTarget: snapshot.target.remainingDailyTarget,
    recentDiscretionary,
    hadUnplannedEssentialRecently,
    currency,
  };
}
