import { FREQUENCY_RULES } from '../constants/thresholds';
import { MoodState, PaceStatus, type DiscretionaryFrequency, type Transaction } from '../types';
import { addDays, toDateKey } from '../utils/dates';
import { sumAmounts } from '../utils/money';

/** Mood ladder from best to worst. */
const MOOD_LADDER: readonly MoodState[] = [
  MoodState.Thriving,
  MoodState.Neutral,
  MoodState.Concerned,
  MoodState.DeadpanDisappointed,
];

const BASE_MOOD_INDEX: Record<PaceStatus, number> = {
  [PaceStatus.Ahead]: 0,
  [PaceStatus.OnTrack]: 1,
  [PaceStatus.SlightlyOver]: 2,
  [PaceStatus.Over]: 3,
};

/** How often the user bought non-essentials in the rolling window ending on refDate. */
export function getDiscretionaryFrequency(
  transactions: Transaction[],
  refDate: Date = new Date(),
  windowDays: number = FREQUENCY_RULES.windowDays,
): DiscretionaryFrequency {
  const refKey = toDateKey(refDate);
  const startKey = addDays(refKey, -(windowDays - 1));
  const inWindow = transactions.filter(
    (t) => !t.is_essential && t.date >= startKey && t.date <= refKey,
  );
  const activeDays = new Set(inWindow.map((t) => t.date)).size;

  return {
    windowDays,
    activeDays,
    transactionCount: inWindow.length,
    total: sumAmounts(inWindow),
    isFrequent:
      activeDays >= FREQUENCY_RULES.activeDaysThreshold ||
      inWindow.length >= FREQUENCY_RULES.transactionCountThreshold,
  };
}

/**
 * Ahead → Thriving, OnTrack → Neutral, SlightlyOver → Concerned, Over → Deadpan Disappointed.
 * Frequent discretionary spending moves the mood one step worse (capped at Deadpan Disappointed),
 * so someone under budget but buying takeout daily gets Neutral, not Thriving.
 * Essential transactions (including emergencies) never affect frequency.
 */
export function determineMood(
  paceStatus: PaceStatus,
  recentTransactions: Transaction[],
  refDate: Date = new Date(),
): MoodState {
  const frequency = getDiscretionaryFrequency(recentTransactions, refDate);
  const index = Math.min(
    BASE_MOOD_INDEX[paceStatus] + (frequency.isFrequent ? 1 : 0),
    MOOD_LADDER.length - 1,
  );
  return MOOD_LADDER[index];
}
