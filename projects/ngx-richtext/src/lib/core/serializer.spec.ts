import { describe, it, expect } from 'vitest';
import { HtmlSerializer } from './serializer';

describe('HtmlSerializer', () => {
  it('serializes empty editor as empty string', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p><br></p>';
    const serializer = new HtmlSerializer();
    expect(serializer.serialize(root)).toBe('');
  });

  it('round-trips content', () => {
    const root = document.createElement('div');
    const serializer = new HtmlSerializer();
    serializer.deserialize('<p><strong>Hi</strong></p>', root);
    expect(serializer.serialize(root)).toContain('<strong>Hi</strong>');
  });

  it('sanitizes on deserialize', () => {
    const root = document.createElement('div');
    const serializer = new HtmlSerializer();
    serializer.deserialize('<p>ok<script>bad()</script></p>', root);
    expect(root.innerHTML).not.toContain('script');
  });
});
