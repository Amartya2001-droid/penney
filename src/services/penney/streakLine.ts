import type { StreakSummary } from '../../utils/streaks';

/** Said on the day a milestone is reached. */
export const MILESTONE_LINES: Record<number, string> = {
  3: 'Three days in a row. A streak. I’m choosing to be cautiously impressed.',
  7: 'A full week within target. I polished myself for the occasion.',
  14: 'Two weeks. I’ve started telling the other coins about you.',
  30: 'Thirty days. This is no longer luck. This is character.',
  60: 'Sixty days. I would stand up and applaud, but I am mostly edge.',
  100: 'One hundred days. I have nothing dry to say. I am simply proud.',
};

const NOT_STARTED = 'Log an expense and I’ll start counting. I’m very good at counting.';
const FIRST_DAY = 'Day one. Stay within today’s target and tomorrow we have a streak.';
const ZERO = 'No streak yet. Stay within today’s target and it starts tomorrow.';

const OVER_TODAY = 'Today’s already over its target. Tomorrow is a clean slate. I’ll be counting.';

const ENDED_TODAY = (days: number) =>
  `Today went over its target, so the ${days}-day streak ends here. Tomorrow starts a new one. I’ll be counting.`;

const ONGOING = [
  (n: number) => `${n} days within target. I’m not saying I’m proud. I’m implying it.`,
  (n: number) => `${n} days in a row. Keep it quiet and I’ll keep counting.`,
  (n: number) => `${n}-day streak. My edge is practically gleaming.`,
];

/** Penney's one-liner for the streak card. Stable for a given day and streak length. */
export function streakLine(streak: StreakSummary, todayKey: string): string {
  if (streak.trackingSince === null) return NOT_STARTED;
  if (streak.endedToday > 0) return ENDED_TODAY(streak.endedToday);
  if (streak.overToday) return OVER_TODAY;
  if (streak.milestoneReached !== null) return MILESTONE_LINES[streak.milestoneReached];
  if (streak.current === 0) return streak.trackingSince === todayKey ? FIRST_DAY : ZERO;
  if (streak.current === 1) return 'One day within target. Every streak starts somewhere. Usually here.';

  let hash = 0;
  for (const ch of `${todayKey}:${streak.current}`) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return ONGOING[Math.abs(hash) % ONGOING.length](streak.current);
}
