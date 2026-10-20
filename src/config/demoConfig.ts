/**
 * Demo presets are shown by default in this prototype.
 * Set EXPO_PUBLIC_PENNEY_DEMO_ENABLED=false to hide them (e.g. for a build shared with real users).
 */
export const DEMO_ENABLED: boolean = !['false', '0', 'off', 'no'].includes(
  (process.env.EXPO_PUBLIC_PENNEY_DEMO_ENABLED ?? '').trim().toLowerCase(),
);
