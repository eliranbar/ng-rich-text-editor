import { sanitizeHtml } from './sanitizer';

/**
 * Clean pasted HTML from Word / Google Docs and fall back to plain text.
 */
export function cleanPastedHtml(html: string, plainText: string): string {
  if (!html?.trim()) {
    return plainTextToHtml(plainText);
  }

  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(meta|link|xml|style|script|o:p|w:[^>]+)[^>]*>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/class='[^']*'/gi, '')
    .replace(/\s*mso-[^;:]+?:[^;]+;?/gi, '')
    .replace(/<\/?span[^>]*>/gi, (match) => {
      // Keep spans that have color/background styles
      if (/style=/i.test(match) && /(color|background)/i.test(match)) {
        return match;
      }
      return match.startsWith('</') ? '</span>' : '';
    });

  cleaned = sanitizeHtml(cleaned);

  if (!cleaned.trim() || !stripTags(cleaned).trim()) {
    return plainTextToHtml(plainText);
  }

  return ensureBlocks(cleaned);
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>') || '<br>'}</p>`);
  return paragraphs.join('') || '<p><br></p>';
}

function stripTags(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? '';
}

function ensureBlocks(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const hasBlock = Array.from(div.childNodes).some(
    (n) =>
      n.nodeType === Node.ELEMENT_NODE &&
      ['P', 'DIV', 'H1', 'H2', 'H3', 'UL', 'OL', 'BLOCKQUOTE', 'TABLE'].includes(
        (n as HTMLElement).tagName,
      ),
  );
  if (!hasBlock) {
    return `<p>${html || '<br>'}</p>`;
  }
  return div.innerHTML;
}
