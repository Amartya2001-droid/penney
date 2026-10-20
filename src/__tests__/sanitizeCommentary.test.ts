import { sanitizeCommentary, splitSentences } from '../services/penney/sanitizeCommentary';

describe('splitSentences', () => {
  it('does not split on decimal points', () => {
    expect(splitSentences('$18.50 on takeout. Noted.')).toEqual(['$18.50 on takeout.', 'Noted.']);
  });
});

describe('sanitizeCommentary', () => {
  it('strips quotes and a name prefix', () => {
    expect(sanitizeCommentary('"Penney: Right on pace. Thrilling."', 140)).toBe('Right on pace. Thrilling.');
  });

  it('keeps at most two sentences', () => {
    expect(sanitizeCommentary('One. Two. Three.', 140)).toBe('One. Two.');
  });

  it('enforces the length cap', () => {
    const result = sanitizeCommentary(`${'word '.repeat(60)}end.`, 140);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(140);
    expect(result!.endsWith('…')).toBe(true);
  });

  it('returns null for empty replies', () => {
    expect(sanitizeCommentary('  "" ', 140)).toBeNull();
  });
});
