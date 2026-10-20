const SENTENCE_END = new Set(['.', '!', '?', '…']);
const WRAPPING_QUOTES = /^["'“”‘’`]+|["'“”‘’`]+$/g;
const NAME_PREFIX = /^penney(\s+says)?\s*[:\-–—]\s*/i;

/** Splits on sentence-ending punctuation followed by whitespace, so "$18.50" stays intact. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const next = text[i + 1];
    if (SENTENCE_END.has(text[i]) && (next === undefined || next === ' ')) {
      sentences.push(text.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences.filter(Boolean);
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Cleans a raw model reply into a display-ready line: strips quotes and name prefixes,
 * keeps at most 2 sentences, and enforces the persona's length cap.
 * Returns null if nothing usable is left.
 */
export function sanitizeCommentary(raw: string, maxLength: number): string | null {
  let text = raw.replace(/\s+/g, ' ').trim();
  text = text.replace(WRAPPING_QUOTES, '').trim();
  text = text.replace(NAME_PREFIX, '').replace(WRAPPING_QUOTES, '').trim();
  if (text === '') return null;

  const sentences = splitSentences(text);
  const twoSentences = sentences.slice(0, 2).join(' ');
  if (twoSentences.length <= maxLength) return twoSentences;

  const first = sentences[0] ?? text;
  if (first.length <= maxLength) return first;

  return truncateAtWord(first, maxLength);
}
