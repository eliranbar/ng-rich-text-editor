/** Premium source-view helpers. */
export const SOURCE_VIEW_FEATURE = 'sourceView' as const;

export function formatHtml(html: string): string {
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}
