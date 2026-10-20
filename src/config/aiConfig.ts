import Constants from 'expo-constants';

export const DEFAULT_AI_BASE_URL = 'https://api.anthropic.com';
export const DEFAULT_AI_MODEL = 'claude-haiku-5-5';
export const DEFAULT_AI_TIMEOUT_MS = 8000;
export const DEFAULT_AI_MAX_TOKENS = 120;

export interface PenneyAiConfig {
  /** True when an AI call can be attempted (a key, or a proxy that holds the key). */
  enabled: boolean;
  /** Anthropic API key. Null when calling through a proxy that adds the key server-side. */
  apiKey: string | null;
  /** API origin. Override with your own proxy URL before shipping to real users. */
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
}

interface ExtraAiConfig {
  apiKey?: unknown;
  baseUrl?: unknown;
  model?: unknown;
  enabled?: unknown;
}

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const isFalseFlag = (value: unknown): boolean => {
  if (value === false) return true;
  const s = cleanString(value);
  return s !== null && ['false', '0', 'off', 'no'].includes(s.toLowerCase());
};

function readExtra(): ExtraAiConfig {
  const extra: unknown = Constants.expoConfig?.extra;
  if (typeof extra !== 'object' || extra === null) return {};
  const ai: unknown = (extra as Record<string, unknown>).penneyAi;
  return typeof ai === 'object' && ai !== null ? (ai as ExtraAiConfig) : {};
}

/**
 * Resolves AI settings. EXPO_PUBLIC_* env vars win over app config `extra.penneyAi`.
 * Env vars must be read with literal `process.env.EXPO_PUBLIC_…` access so Metro can inline them.
 */
export function resolveAiConfig(): PenneyAiConfig {
  const extra = readExtra();

  const apiKey = cleanString(process.env.EXPO_PUBLIC_PENNEY_AI_API_KEY) ?? cleanString(extra.apiKey);
  const customBaseUrl =
    cleanString(process.env.EXPO_PUBLIC_PENNEY_AI_BASE_URL) ?? cleanString(extra.baseUrl);
  const model = cleanString(process.env.EXPO_PUBLIC_PENNEY_AI_MODEL) ?? cleanString(extra.model);
  const killSwitch =
    isFalseFlag(process.env.EXPO_PUBLIC_PENNEY_AI_ENABLED) || isFalseFlag(extra.enabled);

  const baseUrl = (customBaseUrl ?? DEFAULT_AI_BASE_URL).replace(/\/+$/, '');
  // Calling Anthropic directly needs a key; a custom proxy may hold the key itself.
  const hasCredentials = apiKey !== null || customBaseUrl !== null;

  return {
    enabled: !killSwitch && hasCredentials,
    apiKey,
    baseUrl,
    model: model ?? DEFAULT_AI_MODEL,
    timeoutMs: DEFAULT_AI_TIMEOUT_MS,
    maxTokens: DEFAULT_AI_MAX_TOKENS,
  };
}

export const aiConfig: PenneyAiConfig = resolveAiConfig();
