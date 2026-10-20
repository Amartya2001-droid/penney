import { MoodState, PaceStatus } from '../../types';
import type { WeekSummary } from '../../utils/weekSummary';

const MOOD_FOR_STATUS: Record<PaceStatus, MoodState> = {
  [PaceStatus.Ahead]: MoodState.Thriving,
  [PaceStatus.OnTrack]: MoodState.Neutral,
  [PaceStatus.SlightlyOver]: MoodState.Concerned,
  [PaceStatus.Over]: MoodState.DeadpanDisappointed,
};

/** For the week in progress: present tense, with the rest of the week still open. */
export const LINES_IN_PROGRESS: Record<PaceStatus, string[]> = {
  [PaceStatus.Ahead]: [
    'A quiet week so far. Suspiciously responsible. I approve, quietly.',
    'Under target so far. I would applaud, but I am a coin.',
    'Your wallet is having a restful week. So am I.',
  ],
  [PaceStatus.OnTrack]: [
    'Right on target so far. Balanced, like me on my edge.',
    'A perfectly average week so far. I mean that as a compliment. Mostly.',
    'Exactly on budget so far. I have checked the numbers twice. No notes.',
  ],
  [PaceStatus.SlightlyOver]: [
    'A little over so far. A quiet day or two would even it out.',
    'Slightly over target. I’m raising one eyebrow. The other is resting.',
    'The week is running a bit warm. I’ve noted it. Lightly.',
  ],
  [PaceStatus.Over]: [
    'Well over target this week. I’m lying flat about it.',
    'The weekly budget has left the building. I watched it go.',
    'Well over so far. The rest of the week is still unwritten. Unlike the receipts.',
  ],
};

/** For a finished week: past tense. */
export const LINES_FINISHED: Record<PaceStatus, string[]> = {
  [PaceStatus.Ahead]: [
    'A quiet week. Suspiciously responsible. I approved, quietly.',
    'Under target for the week. I would have applauded, but I am a coin.',
    'Your wallet had a restful week. So did I.',
  ],
  [PaceStatus.OnTrack]: [
    'Right on target for the week. Balanced, like me on my edge.',
    'A perfectly average week. I mean that as a compliment. Mostly.',
    'Exactly on budget. I checked the numbers twice. No notes.',
  ],
  [PaceStatus.SlightlyOver]: [
    'A little over for the week. Nothing a quiet weekend couldn’t have fixed.',
    'Slightly over target. One eyebrow went up. The other stayed put.',
    'The week ran a bit warm. I noted it. Lightly.',
  ],
  [PaceStatus.Over]: [
    'The week went well over target. I lay flat about it.',
    'The weekly budget left the building. I watched it go.',
    'Well over for the week. Every Monday is a fresh start. Even for coins.',
  ],
};

const NOTHING_YET = 'Nothing spent yet this week. A blank slate. Thrilling.';
const NOTHING_ALL_WEEK = 'A whole week without a single treat. I am in awe. Quietly.';
const NO_SPEND_STREAK = (days: number) =>
  `${days} no-spend days in one week. I didn’t know you had it in you. I’m pleased. Visibly.`;

function seedFrom(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export interface WeeklyVerdict {
  mood: MoodState;
  message: string;
  /**
   * Shown alongside the verdict when an unplanned essential happened. The verdict itself still
   * judges discretionary spending honestly; this just makes clear the emergency isn't held against you.
   */
  note: string | null;
}

const UNPLANNED_NOTE =
  'An unplanned essential landed this week. That one’s not on you. I lowered the daily targets after it, not my opinion of you.';

/** Penney's one-line take on a week. Deterministic per week and result, so it doesn't change on every render. */
export function weeklyVerdict(summary: WeekSummary): WeeklyVerdict {
  const mood = MOOD_FOR_STATUS[summary.status];
  const note = summary.hadUnplannedEssential ? UNPLANNED_NOTE : null;

  const weekStillGoing = summary.days.some((d) => d.isFuture);

  if (summary.discretionaryTotal === 0) {
    return { mood: MoodState.Thriving, message: weekStillGoing ? NOTHING_YET : NOTHING_ALL_WEEK, note };
  }
  if (summary.status === PaceStatus.Ahead && summary.noSpendDays >= 3) {
    return { mood, message: NO_SPEND_STREAK(summary.noSpendDays), note };
  }

  const pool = (weekStillGoing ? LINES_IN_PROGRESS : LINES_FINISHED)[summary.status];
  return { mood, message: pool[seedFrom(`${summary.start}:${summary.status}`) % pool.length], note };
}
