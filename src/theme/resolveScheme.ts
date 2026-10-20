import type { AppearancePreference, ColorScheme } from '../constants/theme';

export const APPEARANCE_PREFERENCES: readonly AppearancePreference[] = ['system', 'light', 'dark'];

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return typeof value === 'string' && (APPEARANCE_PREFERENCES as readonly string[]).includes(value);
}

/** An explicit choice wins; 'system' follows the device, defaulting to light when it reports nothing. */
export function resolveScheme(
  preference: AppearancePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
