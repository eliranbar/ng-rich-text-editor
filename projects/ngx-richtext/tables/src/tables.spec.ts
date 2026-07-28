import { describe, it, expect } from 'vitest';
import { createTableHtml } from './tables';

describe('tables plugin', () => {
  it('creates a 3x3 table by default', () => {
    const html = createTableHtml();
    expect(html.match(/<tr>/g)?.length).toBe(3);
    expect(html.match(/<td>/g)?.length).toBe(9);
  });
});
