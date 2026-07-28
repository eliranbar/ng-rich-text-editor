import { Injectable } from '@angular/core';
import {
  closestBlock,
  getComputedTextAlign,
  isInside,
} from './dom-utils';

export interface SavedSelection {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
}

/**
 * Selection expressed as character offsets into the editor's text content.
 * Unlike node paths, offsets survive commands that replace elements
 * (renaming a block, wrapping a list, unwrapping a mark).
 */
export interface SavedOffsets {
  start: number;
  end: number;
}

export interface SelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: boolean;
  orderedList: boolean;
  bulletList: boolean;
  /** True when the caret sits inside a table cell. */
  inTable: boolean;
  blockType: 'p' | 'h1' | 'h2' | 'h3' | 'blockquote';
  align: 'left' | 'center' | 'right' | 'justify';
  direction: 'ltr' | 'rtl';
  textColor: string | null;
  backgroundColor: string | null;
  href: string | null;
}

const EMPTY_STATE: SelectionState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: false,
  orderedList: false,
  bulletList: false,
  inTable: false,
  blockType: 'p',
  align: 'left',
  direction: 'ltr',
  textColor: null,
  backgroundColor: null,
  href: null,
};

@Injectable()
export class SelectionService {
  private root: HTMLElement | null = null;

  attach(root: HTMLElement): void {
    this.root = root;
  }

  getRoot(): HTMLElement | null {
    return this.root;
  }

  getRange(): Range | null {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0 || !this.root) {
      return null;
    }
    const range = sel.getRangeAt(0);
    if (!isInside(this.root, range.commonAncestorContainer)) {
      return null;
    }
    return range;
  }

  save(): SavedSelection | null {
    const range = this.getRange();
    if (!range || !this.root) {
      return null;
    }
    return {
      startPath: this.pathTo(range.startContainer),
      startOffset: range.startOffset,
      endPath: this.pathTo(range.endContainer),
      endOffset: range.endOffset,
    };
  }

  restore(saved: SavedSelection | null): void {
    if (!saved || !this.root) {
      return;
    }
    const start = this.nodeFromPath(saved.startPath);
    const end = this.nodeFromPath(saved.endPath);
    if (!start || !end) {
      return;
    }
    const range = document.createRange();
    try {
      range.setStart(start, Math.min(saved.startOffset, this.maxOffset(start)));
      range.setEnd(end, Math.min(saved.endOffset, this.maxOffset(end)));
      const sel = document.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      // Selection restore can fail if DOM changed drastically
    }
  }

  focusEditor(): void {
    this.root?.focus();
  }

  isFocused(): boolean {
    return !!this.root && document.activeElement === this.root;
  }

  /** Capture the selection as text offsets so it survives DOM replacement. */
  saveOffsets(): SavedOffsets | null {
    const range = this.getRange();
    if (!range || !this.root) {
      return null;
    }
    return {
      start: this.offsetOf(range.startContainer, range.startOffset),
      end: this.offsetOf(range.endContainer, range.endOffset),
    };
  }

  /** Re-apply a selection previously captured with {@link saveOffsets}. */
  restoreOffsets(saved: SavedOffsets | null): void {
    if (!saved || !this.root) {
      return;
    }
    const start = this.pointAt(saved.start);
    const end = this.pointAt(saved.end);
    if (!start || !end) {
      return;
    }
    const range = document.createRange();
    try {
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
    } catch {
      return;
    }
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  placeCaretAtEnd(): void {
    if (!this.root) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(this.root);
    range.collapse(false);
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private offsetOf(container: Node, offset: number): number {
    if (!this.root) {
      return 0;
    }
    const probe = document.createRange();
    probe.selectNodeContents(this.root);
    try {
      probe.setEnd(container, offset);
    } catch {
      return 0;
    }
    return probe.toString().length;
  }

  private pointAt(target: number): { node: Node; offset: number } | null {
    if (!this.root) {
      return null;
    }
    const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    let consumed = 0;
    let last: Text | null = null;
    let node = walker.nextNode() as Text | null;
    while (node) {
      const length = node.data.length;
      if (consumed + length >= target) {
        return { node, offset: target - consumed };
      }
      consumed += length;
      last = node;
      node = walker.nextNode() as Text | null;
    }
    if (last) {
      return { node: last, offset: last.data.length };
    }
    const block = this.root.firstElementChild ?? this.root;
    return { node: block, offset: 0 };
  }

  getState(): SelectionState {
    const range = this.getRange();
    if (!range || !this.root) {
      return { ...EMPTY_STATE };
    }

    const node =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as HTMLElement);

    if (!node || !this.root.contains(node)) {
      return { ...EMPTY_STATE };
    }

    const block = closestBlock(node, this.root);
    const blockType = this.resolveBlockType(block);
    const align = this.resolveAlign(block);
    const direction = this.resolveDirection(node);

    return {
      bold: this.hasAncestor(node, ['STRONG', 'B']),
      italic: this.hasAncestor(node, ['EM', 'I']),
      underline: this.hasAncestor(node, ['U']),
      strike: this.hasAncestor(node, ['S', 'STRIKE']),
      link: this.hasAncestor(node, ['A']),
      orderedList: !!node.closest('ol'),
      bulletList: !!node.closest('ul'),
      inTable: !!node.closest('th, td'),
      blockType,
      align,
      direction,
      textColor: this.findStyle(node, 'color'),
      backgroundColor: this.findStyle(node, 'background-color'),
      href: (node.closest('a') as HTMLAnchorElement | null)?.getAttribute('href') ?? null,
    };
  }

  private resolveBlockType(
    block: HTMLElement | null,
  ): SelectionState['blockType'] {
    if (!block) {
      return 'p';
    }
    const tag = block.tagName;
    if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
      return tag.toLowerCase() as 'h1' | 'h2' | 'h3';
    }
    if (tag === 'BLOCKQUOTE') {
      return 'blockquote';
    }
    return 'p';
  }

  private resolveAlign(block: HTMLElement | null): SelectionState['align'] {
    if (!block) {
      return 'left';
    }
    const align = getComputedTextAlign(block);
    if (align === 'center' || align === 'right' || align === 'justify') {
      return align;
    }
    return 'left';
  }

  private resolveDirection(node: Element): SelectionState['direction'] {
    let current: Element | null = node;
    while (current && current !== this.root?.parentElement) {
      const attr = current.getAttribute('dir');
      if (attr === 'rtl' || attr === 'ltr') {
        return attr;
      }
      const styleDir = (current as HTMLElement).style?.direction;
      if (styleDir === 'rtl' || styleDir === 'ltr') {
        return styleDir;
      }
      if (current === this.root) {
        break;
      }
      current = current.parentElement;
    }
    if (this.root) {
      const computed = getComputedStyle(this.root).direction;
      if (computed === 'rtl') {
        return 'rtl';
      }
    }
    return 'ltr';
  }

  private hasAncestor(node: Element, tags: string[]): boolean {
    let current: Element | null = node;
    while (current && current !== this.root) {
      if (tags.includes(current.tagName)) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  private findStyle(node: Element, prop: string): string | null {
    let current: HTMLElement | null = node as HTMLElement;
    while (current && current !== this.root) {
      const value = current.style?.getPropertyValue(prop);
      if (value) {
        return value;
      }
      current = current.parentElement;
    }
    return null;
  }

  private pathTo(node: Node): number[] {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== this.root) {
      const parent: Node | null = current.parentNode;
      if (!parent) {
        break;
      }
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
      current = parent;
    }
    return path;
  }

  private nodeFromPath(path: number[]): Node | null {
    if (!this.root) {
      return null;
    }
    let current: Node = this.root;
    for (const index of path) {
      if (!current.childNodes[index]) {
        return null;
      }
      current = current.childNodes[index];
    }
    return current;
  }

  private maxOffset(node: Node): number {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.length ?? 0;
    }
    return node.childNodes.length;
  }
}
