import { describe, it, expect } from 'vitest';
import { cleanPastedHtml, plainTextToHtml } from './paste';

describe('paste helpers', () => {
  it('converts plain text paragraphs', () => {
    const html = plainTextToHtml('Hello\n\nWorld');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('<p>World</p>');
  });

  it('falls back to plain text when html is empty after cleanup', () => {
    const result = cleanPastedHtml('<!-- only comment -->', 'Plain');
    expect(result).toContain('Plain');
  });

  it('strips word artifacts', () => {
    const dirty =
      '<html><body><p class="MsoNormal" style="mso-margin:0">Hello</p></body></html>';
    const result = cleanPastedHtml(dirty, 'Hello');
    expect(result.toLowerCase()).not.toContain('mso-');
    expect(result).toContain('Hello');
  });
});
