/** Premium word-count helpers. */
export const WORD_COUNT_FEATURE = 'wordCount' as const;

export function countWords(text: string): number {
  const trimmed = text.replace(/\u200b/g, '').trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

export function countChars(text: string): number {
  return text.replace(/\u200b/g, '').trim().length;
}
