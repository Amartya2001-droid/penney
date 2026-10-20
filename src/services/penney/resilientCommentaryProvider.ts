import type { PenneyCommentary, PenneyCommentaryContext, PenneyCommentaryProvider } from '../../types';

/** Tries the primary (AI) provider, and uses the offline line bank if it's missing or fails. */
export class ResilientCommentaryProvider implements PenneyCommentaryProvider {
  constructor(
    private readonly primary: PenneyCommentaryProvider | null,
    private readonly fallback: PenneyCommentaryProvider,
  ) {}

  get hasPrimary(): boolean {
    return this.primary !== null;
  }

  async generateDailyCommentary(context: PenneyCommentaryContext): Promise<PenneyCommentary> {
    if (this.primary) {
      try {
        return await this.primary.generateDailyCommentary(context);
      } catch (error) {
        console.warn(
          '[Penney] AI commentary unavailable, using an offline line:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    return this.fallback.generateDailyCommentary(context);
  }
}
