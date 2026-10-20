import { aiConfig } from '../../config/aiConfig';
import { AnthropicCommentaryProvider } from './anthropicCommentaryProvider';
import { fallbackCommentaryProvider } from './fallbackCommentary';
import { ResilientCommentaryProvider } from './resilientCommentaryProvider';

export { AnthropicCommentaryProvider, PenneyAiError } from './anthropicCommentaryProvider';
export { buildCommentaryContext } from './buildCommentaryContext';
export { buildPenneyPrompt, buildPenneySystemPrompt, buildPenneyUserPrompt } from './buildPenneyPrompt';
export { fallbackCommentaryProvider, FallbackCommentaryProvider } from './fallbackCommentary';
export { ResilientCommentaryProvider } from './resilientCommentaryProvider';
export { sanitizeCommentary } from './sanitizeCommentary';

/** AI when configured, offline line bank otherwise or on any failure. */
export const defaultCommentaryProvider = new ResilientCommentaryProvider(
  aiConfig.enabled ? new AnthropicCommentaryProvider(aiConfig) : null,
  fallbackCommentaryProvider,
);

export const isAiCommentaryEnabled = aiConfig.enabled;
