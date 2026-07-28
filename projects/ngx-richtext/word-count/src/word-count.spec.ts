import { describe, it, expect } from 'vitest';
import { countWords, countChars } from './word-count';

describe('word-count plugin', () => {
  it('counts words and chars', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countChars('hi')).toBe(2);
    expect(countWords('')).toBe(0);
  });
});
