import { ALLOWED_ATTRS, ALLOWED_STYLES, ALLOWED_TAGS } from './dom-utils';

/**
 * Strict allowlist HTML sanitizer. Never assign unsanitized HTML to the editor.
 */
export function sanitizeHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNode(template.content);
  return template.innerHTML;
}

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }

    const el = child as HTMLElement;
    const tag = el.tagName;

    if (!ALLOWED_TAGS.has(tag)) {
      // Keep children, drop the wrapper
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el);
      }
      el.parentNode?.removeChild(el);
      continue;
    }

    // Normalize aliases
    if (tag === 'B') {
      replaceTagKeepingChildren(el, 'strong');
      continue;
    }
    if (tag === 'I') {
      replaceTagKeepingChildren(el, 'em');
      continue;
    }
    if (tag === 'STRIKE') {
      replaceTagKeepingChildren(el, 's');
      continue;
    }

    scrubAttributes(el);
    sanitizeNode(el);
  }
}

function replaceTagKeepingChildren(el: HTMLElement, tagName: string): void {
  const next = document.createElement(tagName);
  while (el.firstChild) {
    next.appendChild(el.firstChild);
  }
  el.parentNode?.replaceChild(next, el);
  scrubAttributes(next);
  sanitizeNode(next);
}

function scrubAttributes(el: HTMLElement): void {
  const allowed = ALLOWED_ATTRS[el.tagName] ?? new Set<string>();
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || name === 'srcdoc') {
      el.removeAttribute(attr.name);
      continue;
    }
    if (!allowed.has(attr.name) && !(allowed.has(name) as boolean)) {
      // style handled separately via allowed set containing 'style'
      if (name !== 'style' || !allowed.has('style')) {
        el.removeAttribute(attr.name);
        continue;
      }
    }
    if (name === 'href' || name === 'src') {
      const value = attr.value.trim();
      if (/^\s*javascript:/i.test(value) || /^\s*data:text\/html/i.test(value)) {
        el.removeAttribute(attr.name);
      }
    }
    if (name === 'dir') {
      const value = attr.value.trim().toLowerCase();
      if (value !== 'ltr' && value !== 'rtl') {
        el.removeAttribute(attr.name);
      } else {
        el.setAttribute('dir', value);
      }
    }
    if (name === 'style') {
      el.setAttribute('style', scrubStyles(attr.value));
      if (!el.getAttribute('style')) {
        el.removeAttribute('style');
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
}

function scrubStyles(styleText: string): string {
  const kept: string[] = [];
  for (const part of styleText.split(';')) {
    const [rawProp, ...rest] = part.split(':');
    if (!rawProp || rest.length === 0) {
      continue;
    }
    const prop = rawProp.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (!ALLOWED_STYLES.has(prop)) {
      continue;
    }
    if (prop === 'direction' && value !== 'ltr' && value !== 'rtl') {
      continue;
    }
    if (/expression|url\s*\(\s*['"]?\s*javascript:/i.test(value)) {
      continue;
    }
    kept.push(`${prop}: ${value}`);
  }
  return kept.join('; ');
}
