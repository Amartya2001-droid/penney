import { useEffect, useMemo, useRef } from 'react';
import { buildCommentaryContext } from '../services/penney/buildCommentaryContext';
import { defaultCommentaryProvider, isAiCommentaryEnabled } from '../services/penney';
import { usePenneyStore } from '../store/usePenneyStore';
import type { MonthSnapshot, PenneyCommentary, PenneyCommentaryProvider } from '../types';

/** Requests in progress, keyed by "date:mood", shared by every component using this hook. */
const inFlight = new Set<string>();
/** Keys already attempted this app session, so a failed AI call isn't retried on every render. */
const attemptedThisSession = new Set<string>();

interface UseDailyCommentaryOptions {
  /**
   * When today's saved line came from the offline bank, try the AI once more per app launch.
   * Defaults to true when AI commentary is configured.
   */
  upgradeFallback?: boolean;
}

/**
 * Returns today's Penney quote. A new one is generated when there's none for today
 * or Penney's mood has changed since it was written.
 */
export function useDailyCommentary(
  snapshot: MonthSnapshot | null,
  provider: PenneyCommentaryProvider = defaultCommentaryProvider,
  options: UseDailyCommentaryOptions = {},
): PenneyCommentary | null {
  const upgradeFallback = options.upgradeFallback ?? isAiCommentaryEnabled;
  const transactions = usePenneyStore((s) => s.transactions);
  const commentaryLog = usePenneyStore((s) => s.commentaryLog);
  const logCommentary = usePenneyStore((s) => s.logCommentary);

  const dateKey = snapshot?.dateKey ?? null;
  const mood = snapshot?.mood ?? null;
  const key = dateKey && mood ? `${dateKey}:${mood}` : null;

  const latestKeyRef = useRef<string | null>(key);
  latestKeyRef.current = key;

  const todays = useMemo(
    () => commentaryLog.find((c) => c.date_key === dateKey) ?? null,
    [commentaryLog, dateKey],
  );
  const isCurrent = todays !== null && todays.mood === mood;
  const wantsUpgrade = isCurrent && upgradeFallback && todays.source === 'fallback';

  useEffect(() => {
    if (!snapshot || !key) return;
    if (isCurrent && !wantsUpgrade) return;
    if (wantsUpgrade && attemptedThisSession.has(key)) return;
    if (inFlight.has(key)) return;

    inFlight.add(key);
    attemptedThisSession.add(key);

    provider
      .generateDailyCommentary(buildCommentaryContext(snapshot, transactions))
      .then((commentary) => {
        // Drop the result if Penney's mood or the date changed while it was being written.
        if (latestKeyRef.current !== key) return;
        // Never replace an existing line with another offline one during an upgrade attempt.
        if (wantsUpgrade && commentary.source === 'fallback') return;
        logCommentary(commentary);
      })
      .catch((error: unknown) => {
        console.warn('[Penney] Could not generate daily commentary:', error);
      })
      .finally(() => {
        inFlight.delete(key);
      });
  }, [snapshot, transactions, key, isCurrent, wantsUpgrade, provider, logCommentary]);

  // While a new line is being generated after a mood change, keep showing today's previous one.
  return todays;
}
