/**
 * Table helpers for ngx-richtext.
 * Import from `ngx-richtext/tables` when you need programmatic table APIs.
 */
export function createTableHtml(rows = 3, cols = 3): string {
  const body = Array.from({ length: rows })
    .map(() => {
      const cells = Array.from({ length: cols })
        .map(() => '<td><br></td>')
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table><tbody>${body}</tbody></table><p><br></p>`;
}

export const TABLES_FEATURE = 'tables' as const;
