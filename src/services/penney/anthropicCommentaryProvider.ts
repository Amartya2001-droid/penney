import type { PenneyAiConfig } from '../../config/aiConfig';
import { PENNEY_PERSONA } from '../../constants/persona';
import type {
  PenneyCommentary,
  PenneyCommentaryContext,
  PenneyCommentaryProvider,
  PenneyPersona,
} from '../../types';
import { generateId } from '../../utils/id';
import { buildPenneyPrompt } from './buildPenneyPrompt';
import { sanitizeCommentary } from './sanitizeCommentary';

const ANTHROPIC_VERSION = '2023-06-01';

export type PenneyAiErrorKind = 'not_configured' | 'timeout' | 'network' | 'http' | 'bad_response';

export class PenneyAiError extends Error {
  readonly kind: PenneyAiErrorKind;
  readonly status: number | null;

  constructor(kind: PenneyAiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'PenneyAiError';
    this.kind = kind;
    this.status = status;
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
}

function extractText(data: unknown): string {
  const content = (data as MessagesResponse | null)?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join(' ');
}

/** Reads the API's error type without ever echoing request headers (and so the key). */
async function describeHttpError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: { type?: unknown; message?: unknown } } | null)?.error;
    const type = typeof error?.type === 'string' ? error.type : 'unknown_error';
    const message = typeof error?.message === 'string' ? `: ${error.message}` : '';
    return `${type}${message}`;
  } catch {
    return 'unreadable error body';
  }
}

/** Generates Penney's daily line with Claude through the Messages API. */
export class AnthropicCommentaryProvider implements PenneyCommentaryProvider {
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly config: PenneyAiConfig,
    private readonly persona: PenneyPersona = PENNEY_PERSONA,
    fetchImpl?: FetchLike,
  ) {
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async generateDailyCommentary(context: PenneyCommentaryContext): Promise<PenneyCommentary> {
    if (!this.config.enabled) {
      throw new PenneyAiError('not_configured', 'AI commentary is not configured.');
    }

    const prompt = buildPenneyPrompt(context, this.persona);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
    };
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
      // Required for calls made straight from a browser (Expo web); ignored on native.
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.config.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (timedOut) {
        throw new PenneyAiError('timeout', `No response within ${this.config.timeoutMs}ms.`);
      }
      throw new PenneyAiError('network', error instanceof Error ? error.message : 'Network request failed.');
    }

    try {
      if (!response.ok) {
        throw new PenneyAiError(
          'http',
          `API returned ${response.status} (${await describeHttpError(response)}).`,
          response.status,
        );
      }

      const data: unknown = await response.json().catch(() => null);
      const message = sanitizeCommentary(extractText(data), this.persona.maxMessageLength);
      if (!message) {
        throw new PenneyAiError('bad_response', 'The API reply contained no usable text.');
      }

      return {
        id: generateId('quote'),
        date_key: context.dateKey,
        mood: context.mood,
        message,
        source: 'ai',
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof PenneyAiError) throw error;
      if (timedOut) {
        throw new PenneyAiError('timeout', `No response within ${this.config.timeoutMs}ms.`);
      }
      throw new PenneyAiError('bad_response', error instanceof Error ? error.message : 'Unreadable reply.');
    } finally {
      clearTimeout(timer);
    }
  }
}
