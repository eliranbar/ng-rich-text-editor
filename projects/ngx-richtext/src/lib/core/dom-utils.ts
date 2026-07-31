export const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'LI',
  'PRE',
]);

/** CSS form of {@link BLOCK_TAGS}, for querying blocks inside a selection. */
export const BLOCK_SELECTOR = 'p, div, h1, h2, h3, h4, h5, h6, blockquote, li, pre';

export const INLINE_MARK_TAGS: Record<string, string> = {
  bold: 'STRONG',
  italic: 'EM',
  underline: 'U',
  strike: 'S',
};

/**
 * Every tag that renders a mark, not just the one we author.
 * Pasted or hand-written HTML uses `<b>`/`<i>`/`<strike>`, and the toolbar
 * reports those as active — so toggling off has to remove them too.
 */
export const INLINE_MARK_ALIASES: Record<string, string[]> = {
  bold: ['STRONG', 'B'],
  italic: ['EM', 'I'],
  underline: ['U'],
  strike: ['S', 'STRIKE'],
};

export const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'SPAN',
  'A',
  'IMG',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'DIV',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
]);

const BLOCK_ATTRS = new Set(['style', 'dir']);

export const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel', 'dir']),
  IMG: new Set([
    'src',
    'alt',
    'title',
    'width',
    'height',
    'data-rte-uploading',
    'data-rte-id',
  ]),
  SPAN: new Set(['style', 'dir']),
  P: BLOCK_ATTRS,
  DIV: BLOCK_ATTRS,
  H1: BLOCK_ATTRS,
  H2: BLOCK_ATTRS,
  H3: BLOCK_ATTRS,
  H4: BLOCK_ATTRS,
  BLOCKQUOTE: BLOCK_ATTRS,
  UL: BLOCK_ATTRS,
  OL: BLOCK_ATTRS,
  LI: BLOCK_ATTRS,
  TD: new Set(['colspan', 'rowspan', 'style', 'dir']),
  TH: new Set(['colspan', 'rowspan', 'style', 'dir']),
  TABLE: new Set(['style', 'dir']),
};

export const ALLOWED_STYLES = new Set([
  'color',
  'background-color',
  'text-align',
  'direction',
  'width',
  'height',
]);

export function isElement(node: Node | null): node is HTMLElement {
  return !!node && node.nodeType === Node.ELEMENT_NODE;
}

export function closestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (isElement(current) && BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

export function isInside(root: HTMLElement, node: Node | null): boolean {
  return !!node && (node === root || root.contains(node));
}

export function wrapNode(node: Node, tagName: string): HTMLElement {
  const wrapper = document.createElement(tagName);
  node.parentNode?.insertBefore(wrapper, node);
  wrapper.appendChild(node);
  return wrapper;
}

export function unwrapNode(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) {
    return;
  }
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

export function renameTag(el: HTMLElement, tagName: string): HTMLElement {
  if (el.tagName === tagName.toUpperCase()) {
    return el;
  }
  const next = document.createElement(tagName);
  while (el.firstChild) {
    next.appendChild(el.firstChild);
  }
  for (const attr of Array.from(el.attributes)) {
    next.setAttribute(attr.name, attr.value);
  }
  el.parentNode?.replaceChild(next, el);
  return next;
}

export function getComputedTextAlign(el: HTMLElement): string {
  const inline = el.style.textAlign;
  if (inline) {
    return inline;
  }
  return getComputedStyle(el).textAlign || 'left';
}

export function normalizeEmptyEditor(root: HTMLElement): void {
  if (root.textContent?.trim() || root.querySelector('img, table')) {
    return;
  }
  const first = root.firstElementChild as HTMLElement | null;
  if (root.childNodes.length === 1 && isEmptyParagraph(first)) {
    // Already the shape we normalize to. Rewriting it would drop attributes such
    // as `dir` — set while the editor was empty — and detach the caret.
    return;
  }
  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  // Carry the writing direction over, so choosing RTL on an empty editor
  // survives the rebuild and the next typed characters run the right way.
  const dir = first?.getAttribute('dir');
  if (dir === 'rtl' || dir === 'ltr') {
    paragraph.setAttribute('dir', dir);
    paragraph.style.direction = dir;
  }
  root.replaceChildren(paragraph);
}

function isEmptyParagraph(el: HTMLElement | null): boolean {
  return el?.tagName === 'P' && el.childNodes.length === 1 && el.firstChild?.nodeName === 'BR';
}

export function isEditorEmpty(root: HTMLElement): boolean {
  // Zero-width markers are caret placeholders left by the mark commands, not content
  const text = root.textContent?.replace(/\u00a0/g, ' ').replace(/\u200b/g, '').trim() ?? '';
  return text.length === 0 && !root.querySelector('img, table');
}
