import { sanitizePersistedState } from '../store/sanitizePersisted';
import type { CategoryBudgets, DateKey, PenneyCommentary, Transaction, UserBudget } from '../types';

/** Backups are a few hundred bytes per expense; anything this large isn't one. */
export const MAX_BACKUP_CHARS = 5_000_000;

/** The parts of a backup that can be restored. Appearance and reminders are device settings and stay put. */
export interface BackupData {
  budget: UserBudget | null;
  transactions: Transaction[];
  commentaryLog: PenneyCommentary[];
  categoryBudgets: CategoryBudgets;
}

export interface ParsedBackup {
  data: BackupData;
  /** When the backup was made, if it says. */
  exportedAt: string | null;
  appVersion: string | null;
  /** Records that couldn't be read and were left out. */
  skipped: number;
  /** Date range of the expenses, or null when there are none. */
  firstDate: DateKey | null;
  lastDate: DateKey | null;
}

export type ParseBackupResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string };

const fail = (error: string): ParseBackupResult => ({ ok: false, error });

/**
 * Reads a Penney backup (the JSON from Settings → Export backup). Pasted text may carry extra
 * words around it from a share sheet or a notes app, so only the outermost {...} is parsed.
 * Every record goes through the same validation as data loaded from storage.
 */
export function parseBackup(text: string): ParseBackupResult {
  const trimmed = text.trim();
  if (trimmed === '') return fail('Nothing to read yet. Choose a backup file or paste its text.');
  if (trimmed.length > MAX_BACKUP_CHARS) return fail('That file is far too large to be a Penney backup.');

  const INCOMPLETE =
    "That backup couldn't be read. If you pasted it, make sure you copied all of it, from the first { to the last }.";
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1) return fail("That isn't a Penney backup. It should start with { and end with }.");
  if (end <= start) return fail(INCOMPLETE);

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return fail(INCOMPLETE);
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || (raw as Record<string, unknown>).app !== 'penney') {
    return fail("That's valid JSON, but it isn't a Penney backup.");
  }
  const loose = raw as Record<string, unknown>;

  const { data, droppedRecords } = sanitizePersistedState(raw);
  if (data.budget === null && data.transactions.length === 0) {
    return fail(
      droppedRecords > 0
        ? 'None of the records in that backup could be read.'
        : 'That backup has no budget and no expenses, so there is nothing to restore.',
    );
  }

  const dates = data.transactions.map((t) => t.date).sort();
  return {
    ok: true,
    backup: {
      data: {
        budget: data.budget,
        transactions: data.transactions,
        commentaryLog: data.commentaryLog,
        categoryBudgets: data.categoryBudgets,
      },
      exportedAt: typeof loose.exportedAt === 'string' ? loose.exportedAt : null,
      appVersion: typeof loose.appVersion === 'string' ? loose.appVersion : null,
      skipped: droppedRecords,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
    },
  };
}

export interface MergePlan {
  /** Expenses from the backup that aren't already here. */
  toAdd: Transaction[];
  /** Expenses skipped because they're already here (same ID, or the same purchase logged at the same moment). */
  alreadyHere: number;
}

const signature = (t: Transaction) => `${t.date}|${t.amount}|${t.category}|${t.description}|${t.created_at}`;

/**
 * Which backup expenses to add when merging. Importing the same backup twice adds nothing the
 * second time, and duplicates inside the backup itself are only added once.
 */
export function planMerge(current: Transaction[], incoming: Transaction[]): MergePlan {
  const ids = new Set(current.map((t) => t.id));
  const signatures = new Set(current.map(signature));
  const toAdd: Transaction[] = [];
  let alreadyHere = 0;

  for (const t of incoming) {
    const sig = signature(t);
    if (ids.has(t.id) || signatures.has(sig)) {
      alreadyHere++;
      continue;
    }
    ids.add(t.id);
    signatures.add(sig);
    toAdd.push(t);
  }
  return { toAdd, alreadyHere };
}
