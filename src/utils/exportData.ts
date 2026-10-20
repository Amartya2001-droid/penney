import Constants from 'expo-constants';
import { Platform, Share } from 'react-native';
import type { CategoryBudgets, PenneyCommentary, Transaction, UserBudget } from '../types';
import { toDateKey } from './dates';

export interface PenneyExport {
  app: 'penney';
  appVersion: string;
  exportedAt: string;
  budget: UserBudget | null;
  categoryBudgets: CategoryBudgets;
  transactions: Transaction[];
  commentaryLog: PenneyCommentary[];
}

export function buildExport(
  budget: UserBudget | null,
  transactions: Transaction[],
  commentaryLog: PenneyCommentary[],
  categoryBudgets: CategoryBudgets = {},
): PenneyExport {
  return {
    app: 'penney',
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    exportedAt: new Date().toISOString(),
    budget,
    categoryBudgets,
    transactions,
    commentaryLog,
  };
}

/**
 * Hands the user a JSON backup: a file download on web, the share sheet on iOS/Android.
 * Returns false if the user dismissed the share sheet.
 */
export async function shareExport(data: PenneyExport): Promise<boolean> {
  const json = JSON.stringify(data, null, 2);
  const fileName = `penney-backup-${toDateKey(new Date())}.json`;

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') throw new Error('Downloads are not available here.');
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  const result = await Share.share({ title: fileName, message: json });
  return result.action !== Share.dismissedAction;
}
