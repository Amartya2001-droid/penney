import type { Category, DateKey } from './finance';
import type { MoodState, PaceStatus } from './engine';

export type PenneyPersonaTrait =
  | 'deadpan'
  | 'witty'
  | 'slightly_sarcastic'
  | 'observant'
  | 'non_judgmental'
  | 'non_nagging';

export interface PenneyPersona {
  name: 'Penney';
  description: string;
  traits: readonly PenneyPersonaTrait[];
  /** Hard cap on characters in one daily message. */
  maxMessageLength: number;
}

/** Trimmed transaction info sent to the model; no IDs or internal fields. */
export interface CommentaryTransactionSummary {
  amount: number;
  category: Category;
  description: string;
  date: DateKey;
}

/** Everything the AI needs to write one daily comment. */
export interface PenneyCommentaryContext {
  dateKey: DateKey;
  mood: MoodState;
  paceStatus: PaceStatus;
  percentOffPace: number | null;
  remainingDailyTarget: number;
  recentDiscretionary: CommentaryTransactionSummary[];
  /** Lets Penney acknowledge an emergency without criticizing it. */
  hadUnplannedEssentialRecently: boolean;
  currency: string;
}

export type CommentarySource = 'ai' | 'fallback';

export interface PenneyCommentary {
  id: string;
  date_key: DateKey;
  mood: MoodState;
  message: string;
  source: CommentarySource;
  /** ISO timestamp. */
  generated_at: string;
}

/** Implemented by the AI provider and the offline fallback provider in src/services/penney/. */
export interface PenneyCommentaryProvider {
  generateDailyCommentary(context: PenneyCommentaryContext): Promise<PenneyCommentary>;
}
