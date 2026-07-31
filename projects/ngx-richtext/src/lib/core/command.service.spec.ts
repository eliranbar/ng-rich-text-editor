import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandService } from './command.service';
import { SelectionService } from './selection.service';
import { HistoryService } from './history.service';

describe('CommandService toggling', () => {
  let root: HTMLElement;
  let commands: CommandService;
  let selection: SelectionService;

  /** Place the caret/selection at text offsets inside the editor root. */
  function select(start: number, end = start): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const points: Array<{ node: Text; start: number; end: number }> = [];
    let length = 0;
    let node = walker.nextNode() as Text | null;
    while (node) {
      points.push({ node, start: length, end: length + node.data.length });
      length += node.data.length;
      node = walker.nextNode() as Text | null;
    }
    const pointAt = (offset: number): [Text, number] => {
      const point = points.find((p) => offset <= p.end);
      if (!point) {
        throw new Error(`offset ${offset} exceeds text length ${length}`);
      }
      return [point.node, offset - point.start];
    };
    const [startNode, startOffset] = pointAt(start);
    const [endNode, endOffset] = pointAt(end);
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  /** Editor HTML with caret placeholders stripped, for readable assertions. */
  function html(): string {
    return root.innerHTML.replace(/​/g, '');
  }

  function state() {
    return selection.getState();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SelectionService, CommandService, HistoryService],
    });
    root = document.createElement('div');
    root.setAttribute('contenteditable', 'true');
    document.body.appendChild(root);
    selection = TestBed.inject(SelectionService);
    commands = TestBed.inject(CommandService);
    selection.attach(root);
    TestBed.inject(HistoryService).attach(root);
  });

  afterEach(() => {
    root.remove();
    TestBed.resetTestingModule();
  });

  describe('inline marks with a collapsed caret', () => {
    it('turns bold off again instead of nesting another wrapper', () => {
      root.innerHTML = '<p>text</p>';
      select(2);

      commands.toggleMark('bold');
      expect(state().bold).toBe(true);

      commands.toggleMark('bold');
      expect(state().bold).toBe(false);
      expect(html()).not.toContain('<strong>');
    });

    it('steps out of an existing bold run and keeps the text bold', () => {
      root.innerHTML = '<p><strong>abcd</strong></p>';
      select(2);

      commands.toggleMark('bold');

      expect(state().bold).toBe(false);
      expect(html()).toContain('<strong>ab</strong>');
      expect(html()).toContain('<strong>cd</strong>');
    });

    it('places the caret before the run when it sits at the start', () => {
      root.innerHTML = '<p><strong>abcd</strong></p>';
      select(0);

      commands.toggleMark('bold');

      expect(state().bold).toBe(false);
      expect(html()).toContain('<strong>abcd</strong>');
    });

    it('keeps italic on when escaping bold inside both marks', () => {
      root.innerHTML = '<p><strong><em>abcd</em></strong></p>';
      select(2);

      commands.toggleMark('bold');

      expect(state().bold).toBe(false);
      expect(state().italic).toBe(true);
    });

    it('turns off a mark authored as <b>', () => {
      root.innerHTML = '<p><b>abcd</b></p>';
      select(2);

      commands.toggleMark('bold');

      expect(state().bold).toBe(false);
    });

    it('toggles each mark independently', () => {
      for (const mark of ['bold', 'italic', 'underline', 'strike'] as const) {
        root.innerHTML = '<p>text</p>';
        select(2);
        commands.toggleMark(mark);
        expect(state()[mark], `${mark} on`).toBe(true);
        commands.toggleMark(mark);
        expect(state()[mark], `${mark} off`).toBe(false);
      }
    });
  });

  describe('inline marks over a selection', () => {
    it('unwraps a mark that was authored as <b>', () => {
      root.innerHTML = '<p><b>abcd</b></p>';
      select(0, 4);

      commands.toggleMark('bold');

      expect(html()).not.toContain('<b>');
      expect(root.textContent).toContain('abcd');
    });

    it('unwraps a mark that was authored as <i>', () => {
      root.innerHTML = '<p><i>abcd</i></p>';
      select(0, 4);

      commands.toggleMark('italic');

      expect(html()).not.toContain('<i>');
      expect(root.textContent).toContain('abcd');
    });

    it('reports bold when the selection starts in an empty text node', () => {
      root.innerHTML = '<p><strong>abcd</strong></p>';
      const paragraph = root.firstElementChild!;
      paragraph.insertBefore(document.createTextNode(''), paragraph.firstChild);
      select(0, 4);

      expect(state().bold).toBe(true);
    });

    it('reports bold off when only part of the selection is bold', () => {
      root.innerHTML = '<p><strong>ab</strong>cd</p>';
      select(0, 4);

      expect(state().bold).toBe(false);
    });

    it('round-trips bold on and off', () => {
      root.innerHTML = '<p>abcd</p>';
      select(0, 4);
      commands.toggleMark('bold');
      expect(html()).toContain('<strong>abcd</strong>');

      select(0, 4);
      commands.toggleMark('bold');
      expect(html()).not.toContain('<strong>');
    });
  });

  describe('lists', () => {
    it('turns a bullet list back into a paragraph', () => {
      root.innerHTML = '<p>item</p>';
      select(2);

      commands.toggleList(false);
      expect(html()).toContain('<ul>');

      commands.toggleList(false);
      expect(html()).not.toContain('<ul>');
      expect(html()).toContain('<p>item</p>');
    });
  });

  describe('colors', () => {
    it('clears the color of a selection inside a colored run', () => {
      root.innerHTML = '<p><span style="color: red">abcd</span></p>';
      select(0, 4);

      commands.setTextColor(null);

      expect(html()).not.toContain('color: red');
      expect(root.textContent).toContain('abcd');
    });

    it('keeps other styles when clearing one of them', () => {
      root.innerHTML =
        '<p><span style="color: red; background-color: yellow">abcd</span></p>';
      select(0, 4);

      commands.setTextColor(null);

      expect(html()).not.toContain('color: red');
      expect(html()).toContain('background-color: yellow');
    });

    it('leaves text outside the selection colored', () => {
      root.innerHTML = '<p><span style="color: red">abcdef</span></p>';
      select(2, 4);

      commands.setTextColor(null);

      expect(root.querySelectorAll('span[style*="color"]').length).toBe(2);
    });

    it('never splits the paragraph when the block itself is colored', () => {
      root.innerHTML = '<p style="color: red">abcd</p>';
      select(0, 4);

      commands.setTextColor(null);

      expect(root.querySelectorAll('p').length).toBe(1);
      expect(root.textContent).toContain('abcd');
    });

    it('steps out of a colored run when clearing at a collapsed caret', () => {
      root.innerHTML = '<p><span style="color: red">abcd</span></p>';
      select(2);

      commands.setTextColor(null);

      expect(state().textColor).toBe(null);
    });
  });
});
