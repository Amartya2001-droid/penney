import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. Non-public env vars (from .env, your shell, or EAS environment variables)
 * are copied into `extra.penneyAi`, which the app reads through expo-constants.
 * Anything placed in `extra` is embedded in the app bundle, so treat it as visible to users.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Penney',
  slug: config.slug ?? 'penney',
  extra: {
    ...config.extra,
    penneyAi: {
      apiKey: process.env.PENNEY_AI_API_KEY ?? null,
      baseUrl: process.env.PENNEY_AI_BASE_URL ?? null,
      model: process.env.PENNEY_AI_MODEL ?? null,
      enabled: process.env.PENNEY_AI_ENABLED ?? null,
    },
  },
});
