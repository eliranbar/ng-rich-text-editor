import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeHtml } from './sanitizer';

describe('sanitizeHtml', () => {
  beforeEach(() => {
    // jsdom document is available via Angular vitest setup
  });

  it('strips script tags and event handlers', () => {
    const dirty =
      '<p onclick="alert(1)">Hi<script>alert(2)</script></p><img src="x" onerror="alert(3)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<p>');
    expect(clean).toContain('Hi');
  });

  it('blocks javascript: urls', () => {
    const dirty = '<a href="javascript:alert(1)">x</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean.toLowerCase()).not.toContain('javascript:');
  });

  it('keeps safe formatting tags', () => {
    const dirty = '<p><strong>Bold</strong> <em>Italic</em></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<strong>Bold</strong>');
    expect(clean).toContain('<em>Italic</em>');
  });

  it('normalizes b/i to strong/em', () => {
    const clean = sanitizeHtml('<p><b>a</b><i>b</i></p>');
    expect(clean).toContain('<strong>');
    expect(clean).toContain('<em>');
  });

  it('allows safe style properties only', () => {
    const clean = sanitizeHtml(
      '<span style="color: red; position: absolute; background-color: yellow">x</span>',
    );
    expect(clean).toContain('color');
    expect(clean).toContain('background-color');
    expect(clean).not.toContain('position');
  });

  it('keeps dir=rtl for RTL languages', () => {
    const clean = sanitizeHtml('<p dir="rtl">שלום</p>');
    expect(clean).toContain('dir="rtl"');
    expect(clean).toContain('שלום');
  });

  it('strips invalid dir values', () => {
    const clean = sanitizeHtml('<p dir="auto-evil">x</p>');
    expect(clean).not.toContain('dir=');
  });
});
