import { Injectable, inject } from '@angular/core';
import { SelectionService } from './selection.service';
import { HistoryService } from './history.service';
import {
  BLOCK_SELECTOR,
  BLOCK_TAGS,
  INLINE_MARK_ALIASES,
  INLINE_MARK_TAGS,
  closestBlock,
  isElement,
  normalizeEmptyEditor,
  renameTag,
  unwrapNode,
} from './dom-utils';
import { sanitizeHtml } from './sanitizer';

export type InlineMark = 'bold' | 'italic' | 'underline' | 'strike';
export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote';
export type AlignType = 'left' | 'center' | 'right' | 'justify';
export type DirectionType = 'ltr' | 'rtl';

@Injectable()
export class CommandService {
  private readonly selection = inject(SelectionService);
  private readonly history = inject(HistoryService);

  private afterChange: (() => void) | null = null;

  onChange(cb: () => void): void {
    this.afterChange = cb;
  }

  /**
   * Run a DOM mutation as a single undoable command.
   *
   * The selection is captured as text offsets beforehand and re-applied after,
   * because commands such as renaming a block or wrapping a list replace
   * elements and would otherwise leave the selection detached — making every
   * following command a no-op.
   *
   * `mutate` may return a node to put the caret in instead, which text offsets
   * cannot express — an empty table cell contributes no text to offset from.
   */
  private runCommand(mutate: (range: Range, root: HTMLElement) => Node | void): void {
    const root = this.selection.getRoot();
    const range = this.selection.getRange();
    if (!root || !range) {
      return;
    }

    this.history.beginCommand();
    const saved = this.selection.saveOffsets();

    const caretTarget = mutate(range, root);

    normalizeEmptyEditor(root);
    this.selection.focusEditor();
    if (caretTarget && root.contains(caretTarget)) {
      this.collapseInside(caretTarget, 0);
    } else {
      this.selection.restoreOffsets(saved);
    }
    this.history.checkpoint();
    this.afterChange?.();
  }

  /** Commit a mutation that manages the caret itself (insertions). */
  private commit(): void {
    const root = this.selection.getRoot();
    if (root) {
      normalizeEmptyEditor(root);
    }
    this.history.checkpoint();
    this.afterChange?.();
  }

  toggleMark(mark: InlineMark): void {
    const tag = INLINE_MARK_TAGS[mark];
    const range = this.selection.getRange();
    const root = this.selection.getRoot();
    if (!range || !root) {
      return;
    }

    if (range.collapsed) {
      this.history.beginCommand();
      this.selection.focusEditor();
      // Already inside the mark: move the caret out of it so the next typed
      // characters are unformatted. Wrapping again would only nest the mark and
      // leave the button stuck on.
      const enclosing = this.closestTag(range.startContainer, INLINE_MARK_ALIASES[mark], root);
      if (enclosing) {
        this.escapeInline(enclosing, range);
        this.commit();
        return;
      }
      // Insert an empty mark wrapper so the next typed characters are formatted
      const el = document.createElement(tag.toLowerCase());
      el.appendChild(document.createTextNode('\u200b'));
      range.insertNode(el);
      this.collapseInside(el.firstChild!, 1);
      this.commit();
      return;
    }

    const active = this.selection.getState()[mark];
    this.runCommand((r, root) => {
      this.applyPerBlock(r, root, (sub) => {
        if (active) {
          this.unwrapMarkInRange(sub, INLINE_MARK_ALIASES[mark]);
        } else {
          this.wrapMarkInRange(sub, tag);
        }
      });
    });
  }

  setBlockType(type: BlockType): void {
    this.runCommand((range, root) => {
      const block = closestBlock(range.startContainer, root);
      if (!block) {
        return;
      }
      if (block.tagName === 'LI') {
        // List items keep their tag; only quoting wraps the item
        if (type === 'blockquote') {
          const quote = document.createElement('blockquote');
          block.parentNode?.insertBefore(quote, block);
          quote.appendChild(block);
        }
        return;
      }
      renameTag(block, type === 'p' ? 'p' : type);
    });
  }

  setAlignment(align: AlignType): void {
    this.runCommand((range, root) => {
      let block = closestBlock(range.startContainer, root);
      if (!block) {
        return;
      }
      if (block.tagName === 'LI') {
        block = block.parentElement ?? block;
      }
      block.style.textAlign = align;
    });
  }

  /**
   * Set writing direction on the current block (and list container when inside a list).
   * Uses the HTML `dir` attribute so Hebrew/Arabic layout and caret behavior are correct.
   */
  setDirection(direction: DirectionType): void {
    this.runCommand((range, root) => {
      let block = closestBlock(range.startContainer, root);
      if (!block) {
        return;
      }
      if (block.tagName === 'LI') {
        const list = block.parentElement;
        if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
          list.setAttribute('dir', direction);
          block = list;
        }
      }
      block.setAttribute('dir', direction);
      block.style.direction = direction;
    });
  }

  /** Apply direction to the whole editor root (document-level RTL/LTR). */
  setEditorDirection(direction: DirectionType): void {
    const root = this.selection.getRoot();
    if (!root) {
      return;
    }
    this.history.beginCommand();
    root.setAttribute('dir', direction);
    root.style.direction = direction;
    this.commit();
  }

  toggleList(ordered: boolean): void {
    this.runCommand((range, root) => {
      const node = this.elementAt(range.startContainer);
      if (!node) {
        return;
      }

      const sameList = node.closest(ordered ? 'ol' : 'ul');
      const otherList = node.closest(ordered ? 'ul' : 'ol');

      if (sameList) {
        this.unwrapList(sameList as HTMLElement);
        return;
      }
      if (otherList) {
        renameTag(otherList as HTMLElement, ordered ? 'ol' : 'ul');
        return;
      }

      const block = closestBlock(node, root);
      if (!block) {
        return;
      }
      const list = document.createElement(ordered ? 'ol' : 'ul');
      const item = document.createElement('li');
      while (block.firstChild) {
        item.appendChild(block.firstChild);
      }
      if (!item.firstChild) {
        item.appendChild(document.createElement('br'));
      }
      list.appendChild(item);
      block.parentNode?.replaceChild(list, block);
    });
  }

  setTextColor(color: string | null): void {
    this.applyInlineStyle('color', color);
  }

  setBackgroundColor(color: string | null): void {
    this.applyInlineStyle('background-color', color);
  }

  setLink(href: string | null): void {
    const range = this.selection.getRange();
    if (!range) {
      return;
    }

    // Removing a link: unwrap the anchor at the caret or any inside the selection
    if (!href) {
      this.runCommand((r, root) => {
        const anchors = this.anchorsInRange(r, root);
        for (const anchor of anchors) {
          unwrapNode(anchor);
        }
      });
      return;
    }

    const existing = this.anchorsInRange(range, this.selection.getRoot()!);
    if (existing.length > 0) {
      this.runCommand((r, root) => {
        for (const anchor of this.anchorsInRange(r, root)) {
          anchor.setAttribute('href', href);
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
      });
      return;
    }

    if (range.collapsed) {
      // No selection: insert the URL as its own link
      this.history.beginCommand();
      this.selection.focusEditor();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', href);
      anchor.setAttribute('rel', 'noopener noreferrer');
      anchor.textContent = href;
      range.insertNode(anchor);
      this.collapseAfter(anchor);
      this.commit();
      return;
    }

    this.runCommand((r, root) => {
      this.applyPerBlock(r, root, (sub) => {
        const anchor = this.wrapMarkInRange(sub, 'A');
        anchor.setAttribute('href', href);
        anchor.setAttribute('rel', 'noopener noreferrer');
      });
    });
  }

  clearFormatting(): void {
    const range = this.selection.getRange();
    if (!range || range.collapsed) {
      return;
    }
    this.runCommand((r, root) => {
      this.applyPerBlock(r, root, (sub) => {
        const block = closestBlock(sub.commonAncestorContainer, root);
        if (block) {
          // The selection usually sits *inside* the marks being cleared, so the
          // enclosing inline elements have to be split open first.
          this.liftOutOfInline(sub, block);
        }
        const text = sub.extractContents().textContent ?? '';
        if (text) {
          sub.insertNode(document.createTextNode(text));
        }
      });
    });
  }

  insertHtml(html: string): void {
    const range = this.selection.getRange();
    if (!range) {
      return;
    }
    this.history.beginCommand();
    range.deleteContents();
    const template = document.createElement('template');
    template.innerHTML = sanitizeHtml(html);
    const last = template.content.lastChild;
    range.insertNode(template.content);
    if (last) {
      this.collapseAfter(last);
    }
    this.commit();
  }

  insertImage(src: string, attrs: Record<string, string> = {}): HTMLImageElement | null {
    const img = document.createElement('img');
    img.src = src;
    img.alt = attrs['alt'] ?? '';
    for (const [key, value] of Object.entries(attrs)) {
      img.setAttribute(key, value);
    }
    this.insertHtml(img.outerHTML);
    const root = this.selection.getRoot();
    return root?.querySelector(`img[src="${CSS.escape(src)}"]`) ?? null;
  }

  /** Insert a table of any size at the caret and place the caret in its first cell. */
  insertTable(rows: number, columns: number, options: { header?: boolean } = {}): void {
    const rowCount = Math.max(1, Math.floor(rows));
    const columnCount = Math.max(1, Math.floor(columns));
    const range = this.selection.getRange();
    const root = this.selection.getRoot();
    if (!range || !root) {
      return;
    }

    this.history.beginCommand();
    this.selection.focusEditor();

    const table = document.createElement('table');
    let bodyRows = rowCount;
    if (options.header) {
      const head = document.createElement('thead');
      head.appendChild(this.buildRow(columnCount, 'th'));
      table.appendChild(head);
      bodyRows = rowCount - 1;
    }
    const body = document.createElement('tbody');
    for (let i = 0; i < Math.max(bodyRows, 0); i++) {
      body.appendChild(this.buildRow(columnCount, 'td'));
    }
    table.appendChild(body);

    // Keep a paragraph after the table so the caret can leave it
    const trailing = document.createElement('p');
    trailing.appendChild(document.createElement('br'));

    // A table nested inside a paragraph or list is invalid markup: re-parsing it
    // during serialization drops rows or the table itself. Always insert it as a
    // sibling of the top-level block instead.
    const anchor = this.topLevelBlock(range.startContainer, root);
    range.deleteContents();

    if (!anchor) {
      const fragment = document.createDocumentFragment();
      fragment.append(table, trailing);
      range.insertNode(fragment);
    } else if (!anchor.textContent?.trim() && anchor.tagName !== 'TABLE') {
      anchor.replaceWith(table, trailing);
    } else {
      // Move whatever follows the caret into its own block after the table
      const tail = document.createRange();
      tail.setStart(range.startContainer, range.startOffset);
      tail.setEnd(anchor, anchor.childNodes.length);
      const rest = tail.extractContents();
      anchor.after(table, trailing);
      if (rest.textContent?.trim()) {
        const restBlock = anchor.cloneNode(false) as HTMLElement;
        restBlock.appendChild(rest);
        trailing.replaceWith(restBlock);
      }
      // The caret was at the very start, so nothing is left before the table
      if (!anchor.textContent?.trim() && !anchor.querySelector('img')) {
        anchor.remove();
      }
    }

    const firstCell = table.querySelector('th, td');
    if (firstCell) {
      this.collapseInside(firstCell, 0);
    }
    this.commit();
  }

  insertTableRow(where: 'above' | 'below'): void {
    this.runCommand((range, root) => {
      const cell = this.currentCell(range, root);
      const row = cell?.parentElement as HTMLTableRowElement | null;
      if (!cell || !row) {
        return;
      }
      const fresh = this.buildRow(this.columnCount(row.closest('table')), 'td');
      // A row added around the header would land outside <thead>, so it goes
      // to the top of the body instead.
      if (row.parentElement?.tagName === 'THEAD') {
        row.closest('table')?.querySelector('tbody')?.prepend(fresh);
      } else if (where === 'above') {
        row.before(fresh);
      } else {
        row.after(fresh);
      }
      return cell;
    });
  }

  insertTableColumn(where: 'before' | 'after'): void {
    this.runCommand((range, root) => {
      const cell = this.currentCell(range, root);
      const table = cell?.closest('table');
      if (!cell || !table) {
        return;
      }
      const index = this.cellIndex(cell);
      for (const row of Array.from(table.rows)) {
        const reference = row.cells[index];
        const tag = row.parentElement?.tagName === 'THEAD' ? 'th' : 'td';
        const fresh = this.buildCell(tag);
        if (!reference) {
          row.appendChild(fresh);
        } else if (where === 'before') {
          reference.before(fresh);
        } else {
          reference.after(fresh);
        }
      }
      return cell;
    });
  }

  deleteTableRow(): void {
    this.runCommand((range, root) => {
      const cell = this.currentCell(range, root);
      const row = cell?.parentElement as HTMLTableRowElement | null;
      const table = cell?.closest('table');
      if (!cell || !row || !table) {
        return;
      }
      if (table.rows.length <= 1) {
        table.remove();
        return;
      }
      const columnIndex = this.cellIndex(cell);
      const rowIndex = row.rowIndex;
      const section = row.parentElement;
      row.remove();
      if (section && section.tagName !== 'TABLE' && section.children.length === 0) {
        section.remove();
      }
      const nextRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
      return nextRow?.cells[Math.min(columnIndex, nextRow.cells.length - 1)];
    });
  }

  deleteTableColumn(): void {
    this.runCommand((range, root) => {
      const cell = this.currentCell(range, root);
      const table = cell?.closest('table');
      if (!cell || !table) {
        return;
      }
      const index = this.cellIndex(cell);
      if (this.columnCount(table) <= 1) {
        table.remove();
        return;
      }
      for (const row of Array.from(table.rows)) {
        row.cells[index]?.remove();
      }
      const row = table.rows[0];
      return row?.cells[Math.min(index, row.cells.length - 1)];
    });
  }

  deleteTable(): void {
    this.runCommand((range, root) => {
      this.currentCell(range, root)?.closest('table')?.remove();
    });
  }

  /** The direct child of the editor root that contains `node`. */
  private topLevelBlock(node: Node, root: HTMLElement): HTMLElement | null {
    let current = this.elementAt(node);
    let top: HTMLElement | null = null;
    while (current && current !== root) {
      top = current;
      current = current.parentElement;
    }
    return top;
  }

  /** The table cell containing the selection, if any. */
  currentCell(range: Range, root: HTMLElement): HTMLTableCellElement | null {
    const cell = this.elementAt(range.startContainer)?.closest('th, td');
    return cell && root.contains(cell) ? (cell as HTMLTableCellElement) : null;
  }

  private buildRow(columns: number, tag: 'th' | 'td'): HTMLTableRowElement {
    const row = document.createElement('tr');
    for (let i = 0; i < columns; i++) {
      row.appendChild(this.buildCell(tag));
    }
    return row;
  }

  private buildCell(tag: string): HTMLTableCellElement {
    const cell = document.createElement(tag);
    cell.appendChild(document.createElement('br'));
    return cell as HTMLTableCellElement;
  }

  /** Widest row in the table, so ragged tables still grow consistently. */
  private columnCount(table: HTMLTableElement | null): number {
    if (!table) {
      return 1;
    }
    return Array.from(table.rows).reduce((max, row) => Math.max(max, row.cells.length), 1);
  }

  private cellIndex(cell: HTMLTableCellElement): number {
    return Array.from((cell.parentElement as HTMLTableRowElement).cells).indexOf(cell);
  }

  undo(): void {
    if (this.history.undo()) {
      this.selection.focusEditor();
      this.selection.placeCaretAtEnd();
      this.afterChange?.();
    }
  }

  redo(): void {
    if (this.history.redo()) {
      this.selection.focusEditor();
      this.selection.placeCaretAtEnd();
      this.afterChange?.();
    }
  }

  handleTab(shift: boolean): boolean {
    const root = this.selection.getRoot();
    const range = this.selection.getRange();
    if (!root || !range) {
      return false;
    }
    const item = this.elementAt(range.startContainer)?.closest('li');
    if (!item) {
      return false;
    }

    if (shift) {
      const list = item.parentElement;
      const parentItem = list?.parentElement?.closest('li');
      if (parentItem && list) {
        this.runCommand(() => {
          parentItem.after(item);
          if (!list.children.length) {
            list.remove();
          }
        });
      }
      return true;
    }

    const previous = item.previousElementSibling;
    if (!previous) {
      return true;
    }
    this.runCommand(() => {
      let nested = previous.querySelector(':scope > ul, :scope > ol') as HTMLElement | null;
      if (!nested) {
        nested = document.createElement(item.parentElement?.tagName === 'OL' ? 'ol' : 'ul');
        previous.appendChild(nested);
      }
      nested.appendChild(item);
    });
    return true;
  }

  private applyInlineStyle(prop: string, value: string | null): void {
    const range = this.selection.getRange();
    const root = this.selection.getRoot();
    if (!range || !root) {
      return;
    }

    if (range.collapsed) {
      this.history.beginCommand();
      this.selection.focusEditor();
      // Clearing inside a styled run: an empty span would sit *inside* it and
      // inherit the very style being cleared, so step out of the run instead.
      const styled = !value ? this.closestStyled(range.startContainer, prop, root) : null;
      if (styled) {
        const rewrap = styled.cloneNode(false) as HTMLElement;
        rewrap.style.removeProperty(prop);
        this.escapeInline(styled, range, rewrap.getAttribute('style') ? rewrap : undefined);
        this.commit();
        return;
      }
      const span = document.createElement('span');
      if (value) {
        span.style.setProperty(prop, value);
      }
      span.appendChild(document.createTextNode('\u200b'));
      range.insertNode(span);
      this.collapseInside(span.firstChild!, 1);
      this.commit();
      return;
    }

    this.runCommand((r, root) => {
      this.applyPerBlock(r, root, (sub) => {
        if (!value) {
          this.stripStyleInRange(sub, prop, root);
          return;
        }
        const contents = sub.extractContents();
        // Drop the property from nested spans so the new value wins
        for (const nested of Array.from(contents.querySelectorAll<HTMLElement>('span'))) {
          nested.style.removeProperty(prop);
          if (!nested.getAttribute('style')) {
            unwrapNode(nested);
          }
        }
        const span = document.createElement('span');
        span.style.setProperty(prop, value);
        span.appendChild(contents);
        sub.insertNode(span);
      });
    });
  }

  /**
   * Remove an inline style from the selection. Ancestors that set it are split
   * so text outside the selection keeps the style, and any other formatting they
   * carry is re-applied to the selected part.
   */
  private stripStyleInRange(range: Range, prop: string, root: HTMLElement): void {
    for (let depth = 0; depth < 10; depth++) {
      const styled = this.closestStyled(range.startContainer, prop, root);
      if (!styled) {
        break;
      }
      const rewrap = styled.cloneNode(false) as HTMLElement;
      rewrap.style.removeProperty(prop);
      this.splitAroundRange(styled, range);
      if (rewrap.tagName !== 'SPAN' || rewrap.getAttribute('style')) {
        rewrap.appendChild(range.extractContents());
        range.insertNode(rewrap);
        range.selectNode(rewrap);
      }
    }

    const contents = range.extractContents();
    for (const nested of Array.from(contents.querySelectorAll<HTMLElement>('*'))) {
      if (!nested.style?.getPropertyValue(prop)) {
        continue;
      }
      nested.style.removeProperty(prop);
      if (nested.tagName === 'SPAN' && !nested.getAttribute('style')) {
        unwrapNode(nested);
      }
    }
    range.insertNode(contents);
  }

  /**
   * Run an inline mutation once per block covered by the selection.
   *
   * Applying it to the whole range would wrap the block elements themselves and
   * produce invalid markup such as `<strong><p>text</p></strong>`.
   */
  private applyPerBlock(range: Range, root: HTMLElement, mutate: (sub: Range) => void): void {
    // Later blocks first, so mutating one does not shift the ranges still to come
    for (const sub of this.blockRanges(range, root).reverse()) {
      mutate(sub);
    }
  }

  private blockRanges(range: Range, root: HTMLElement): Range[] {
    const startBlock = closestBlock(range.startContainer, root);
    if (startBlock && startBlock === closestBlock(range.endContainer, root)) {
      return [range.cloneRange()];
    }

    const blocks = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
      (block) => !block.querySelector(BLOCK_SELECTOR) && range.intersectsNode(block),
    );

    const ranges: Range[] = [];
    for (const block of blocks) {
      const sub = document.createRange();
      sub.selectNodeContents(block);
      try {
        if (range.comparePoint(sub.startContainer, sub.startOffset) < 0) {
          sub.setStart(range.startContainer, range.startOffset);
        }
        if (range.comparePoint(sub.endContainer, sub.endOffset) > 0) {
          sub.setEnd(range.endContainer, range.endOffset);
        }
      } catch {
        continue;
      }
      if (!sub.collapsed) {
        ranges.push(sub);
      }
    }
    return ranges.length > 0 ? ranges : [range.cloneRange()];
  }

  private wrapMarkInRange(range: Range, tag: string): HTMLElement {
    const contents = range.extractContents();
    const wrapper = document.createElement(tag.toLowerCase());
    wrapper.appendChild(contents);
    range.insertNode(wrapper);
    return wrapper;
  }

  private unwrapMarkInRange(range: Range, tags: string[]): void {
    const root = this.selection.getRoot();
    if (!root) {
      return;
    }
    const selector = tags.map((tag) => tag.toLowerCase()).join(', ');

    // Split enclosing marks so text outside the selection keeps its formatting.
    // Nested wrappers (`<b><strong>`) need one pass each.
    for (let depth = 0; depth < 10; depth++) {
      const enclosing = this.closestTag(range.startContainer, tags, root);
      if (!enclosing) {
        break;
      }
      this.splitAroundRange(enclosing, range);
    }

    const contents = range.extractContents();
    for (const el of Array.from(contents.querySelectorAll<HTMLElement>(selector))) {
      unwrapNode(el);
    }
    range.insertNode(contents);

    // Remove wrappers that became empty after splitting
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      if (!this.hasContent(el)) {
        el.remove();
      }
    }
  }

  /**
   * Move a collapsed caret out of `element`, splitting it in two so the text on
   * either side keeps its formatting. Inline wrappers between the caret and
   * `element` are recreated around the caret, so escaping bold inside
   * `<strong><em>` leaves italic switched on.
   */
  private escapeInline(element: HTMLElement, range: Range, rewrap?: HTMLElement): void {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }

    const inner: HTMLElement[] = [];
    let current = this.elementAt(range.startContainer);
    while (current && current !== element && element.contains(current)) {
      inner.push(current);
      current = current.parentElement;
    }

    const after = range.cloneRange();
    after.selectNodeContents(element);
    try {
      after.setStart(range.startContainer, range.startOffset);
    } catch {
      return;
    }
    const tail = after.extractContents();

    const caret = document.createTextNode('​');
    let marker: Node = caret;
    for (const wrapper of [...inner, ...(rewrap ? [rewrap] : [])]) {
      const clone = wrapper.cloneNode(false) as HTMLElement;
      clone.appendChild(marker);
      marker = clone;
    }

    parent.insertBefore(marker, element.nextSibling);
    if (tail.textContent || tail.querySelector('img')) {
      const clone = element.cloneNode(false) as HTMLElement;
      clone.appendChild(tail);
      parent.insertBefore(clone, marker.nextSibling);
    }
    // The caret was at the very start, so nothing is left inside the mark
    if (!this.hasContent(element)) {
      element.remove();
    }
    this.collapseInside(caret, 1);
  }

  /** True when an element holds something other than caret placeholders. */
  private hasContent(el: HTMLElement): boolean {
    return !!el.textContent?.replace(/​/g, '') || !!el.querySelector('img, br');
  }

  /**
   * Split every inline element between the range and its block, so the selected
   * content ends up as a direct child of the block while text outside the
   * selection keeps its formatting.
   */
  private liftOutOfInline(range: Range, block: HTMLElement): void {
    for (let depth = 0; depth < 20; depth++) {
      const parent = this.elementAt(range.commonAncestorContainer);
      if (!parent || parent === block || BLOCK_TAGS.has(parent.tagName)) {
        return;
      }
      this.splitAroundRange(parent, range);
    }
  }

  /**
   * Split `element` so the selected part is a standalone sibling, leaving the
   * text before and after the selection wrapped as before.
   */
  private splitAroundRange(element: HTMLElement, range: Range): void {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }

    const after = range.cloneRange();
    after.selectNodeContents(element);
    after.setStart(range.endContainer, range.endOffset);
    const afterContents = after.extractContents();

    const before = range.cloneRange();
    before.selectNodeContents(element);
    before.setEnd(range.startContainer, range.startOffset);
    const beforeContents = before.extractContents();

    if (beforeContents.textContent) {
      const clone = element.cloneNode(false) as HTMLElement;
      clone.appendChild(beforeContents);
      parent.insertBefore(clone, element);
    }
    if (afterContents.textContent) {
      const clone = element.cloneNode(false) as HTMLElement;
      clone.appendChild(afterContents);
      parent.insertBefore(clone, element.nextSibling);
    }

    // `element` now holds only the selection — lift it out of the mark
    const selected = document.createDocumentFragment();
    while (element.firstChild) {
      selected.appendChild(element.firstChild);
    }
    const first = selected.firstChild;
    const last = selected.lastChild;
    parent.replaceChild(selected, element);
    if (first && last) {
      range.setStartBefore(first);
      range.setEndAfter(last);
    }
  }

  private unwrapList(list: HTMLElement): void {
    const parent = list.parentNode;
    if (!parent) {
      return;
    }
    for (const item of Array.from(list.children)) {
      const paragraph = document.createElement('p');
      while (item.firstChild) {
        paragraph.appendChild(item.firstChild);
      }
      if (!paragraph.firstChild) {
        paragraph.appendChild(document.createElement('br'));
      }
      parent.insertBefore(paragraph, list);
    }
    parent.removeChild(list);
  }

  private anchorsInRange(range: Range, root: HTMLElement): HTMLAnchorElement[] {
    const enclosing = this.elementAt(range.startContainer)?.closest('a');
    if (enclosing && root.contains(enclosing)) {
      return [enclosing as HTMLAnchorElement];
    }
    return Array.from(root.querySelectorAll('a')).filter((anchor) =>
      range.intersectsNode(anchor),
    );
  }

  private elementAt(node: Node): HTMLElement | null {
    return node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : isElement(node)
        ? node
        : null;
  }

  private closestTag(node: Node, tags: string[], root: HTMLElement): HTMLElement | null {
    let current = this.elementAt(node);
    while (current && current !== root) {
      if (tags.includes(current.tagName)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Nearest inline ancestor that sets `prop` itself. Blocks are excluded: a
   * paragraph is not a run of styled text and must never be split apart.
   */
  private closestStyled(node: Node, prop: string, root: HTMLElement): HTMLElement | null {
    let current = this.elementAt(node);
    while (current && current !== root && !BLOCK_TAGS.has(current.tagName)) {
      if (current.style?.getPropertyValue(prop)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  private collapseInside(node: Node, offset: number): void {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private collapseAfter(node: Node): void {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
