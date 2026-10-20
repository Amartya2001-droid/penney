export const PACE_THRESHOLDS = {
  /** Within ±5% of the allowance to date counts as "on track". */
  onTrackBandPct: 5,
  /** Over by more than 5% and up to 25% is "slightly over"; beyond 25% is "over". */
  slightlyOverMaxPct: 25,
} as const;

export const FREQUENCY_RULES = {
  /** Rolling window used to judge how often the user buys non-essentials. */
  windowDays: 7,
  /** Discretionary purchases on 5+ distinct days in the window counts as frequent... */
  activeDaysThreshold: 5,
  /** ...as do 8+ discretionary transactions in the window. */
  transactionCountThreshold: 8,
} as const;
