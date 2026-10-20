import { CATEGORY_META } from '../../constants/categories';
import { PENNEY_PERSONA } from '../../constants/persona';
import {
  MoodState,
  type CommentaryTransactionSummary,
  type PenneyCommentary,
  type PenneyCommentaryContext,
  type PenneyCommentaryProvider,
} from '../../types';
import { generateId } from '../../utils/id';
import { formatCurrency } from '../../utils/money';

type SpendLine = (t: CommentaryTransactionSummary, currency: string) => string;

const GENERAL_LINES: Record<MoodState, string[]> = {
  [MoodState.Thriving]: [
    "Under budget again. I'm not saying I'm proud. I'm just noticeably shinier.",
    "Your savings are growing. I've started referring to myself as a nest egg.",
    'Nothing reckless today. I had a whole speech prepared, too.',
    "We're ahead of pace. I'd do a celebratory spin, but that's just my resting state.",
    'Look at you, not spending money. Very avant-garde.',
  ],
  [MoodState.Neutral]: [
    'Right on pace. Thrilling. Truly the middle of the road.',
    'Perfectly balanced. Like me, standing on my edge, moments before falling over.',
    'Exactly where we should be. I have no notes.',
    "On track. I'll allow myself one modest clink.",
  ],
  [MoodState.Concerned]: [
    "We're a little over. Not a crisis. Just a raised eyebrow I've been practicing.",
    "Slightly ahead of the budget. Unfortunately, it's the wrong direction.",
    "I've seen the recent purchases. I'm choosing to say nothing. Loudly.",
  ],
  [MoodState.DeadpanDisappointed]: [
    "I'm not mad. I'm a coin. I'm just flat.",
    'Our discretionary budget has left the chat.',
    "I've stopped counting. Which, for a coin, is a big deal.",
  ],
};

const SPEND_AWARE_LINES: Partial<Record<MoodState, SpendLine[]>> = {
  [MoodState.Concerned]: [
    (t, cur) => `${formatCurrency(t.amount, cur)} on ${CATEGORY_META[t.category].label}. Noted. Mentally. Permanently.`,
    (t) => `I saw the ${CATEGORY_META[t.category].label} purchase. I've decided to have no opinion. Out loud.`,
  ],
  [MoodState.DeadpanDisappointed]: [
    (t) => `${CATEGORY_META[t.category].label} again. At this point it's less a purchase and more a personality.`,
    (t, cur) => `${formatCurrency(t.amount, cur)} on ${CATEGORY_META[t.category].label}. I'm going to lie flat for a bit. Easy for me.`,
  ],
};

const UNPLANNED_ESSENTIAL_LINES = [
  "An unplanned essential showed up. Not a character flaw. I've quietly redone the math.",
  "Life sent a surprise bill. I've spread it over the rest of the month. No commentary required.",
  "Essentials happen. I've adjusted your daily target and filed my opinions under 'none.'",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function enforceLength(line: string): string {
  const max = PENNEY_PERSONA.maxMessageLength;
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`;
}

export function pickFallbackLine(context: PenneyCommentaryContext): string {
  const seed = hashString(`${context.dateKey}:${context.mood}`);

  if (context.hadUnplannedEssentialRecently) {
    return enforceLength(UNPLANNED_ESSENTIAL_LINES[seed % UNPLANNED_ESSENTIAL_LINES.length]);
  }

  const latest = context.recentDiscretionary[0];
  const spendLines = latest
    ? (SPEND_AWARE_LINES[context.mood] ?? []).map((line) => line(latest, context.currency))
    : [];
  const pool = [...GENERAL_LINES[context.mood], ...spendLines];

  return enforceLength(pool[seed % pool.length]);
}

export class FallbackCommentaryProvider implements PenneyCommentaryProvider {
  async generateDailyCommentary(context: PenneyCommentaryContext): Promise<PenneyCommentary> {
    return {
      id: generateId('quote'),
      date_key: context.dateKey,
      mood: context.mood,
      message: pickFallbackLine(context),
      source: 'fallback',
      generated_at: new Date().toISOString(),
    };
  }
}

export const fallbackCommentaryProvider = new FallbackCommentaryProvider();
