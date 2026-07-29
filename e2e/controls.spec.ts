import { test, expect, Page } from '@playwright/test';

const EDITOR = '.ngx-rte__content';
const OUTPUT = '.demo__preview pre';

/** Clear the editor and type fresh text, leaving the caret in the editor. */
async function typeFresh(page: Page, text: string): Promise<void> {
  await page.locator(EDITOR).click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text);
}

/** Select all content inside the editor. */
async function selectAll(page: Page): Promise<void> {
  await page.locator(EDITOR).click();
  await page.keyboard.press('ControlOrMeta+A');
}

/** Set a deterministic text selection inside the editor. */
async function selectTextRange(page: Page, start: number, end = start): Promise<void> {
  await page.locator(EDITOR).evaluate(
    (editor, offsets) => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const points: Array<{ node: Text; start: number; end: number }> = [];
      let length = 0;
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const text = node as Text;
        points.push({ node: text, start: length, end: length + text.length });
        length += text.length;
      }

      const pointAt = (offset: number): [Text, number] => {
        const point = points.find(({ end: pointEnd }) => offset <= pointEnd);
        if (!point) {
          throw new Error(`Selection offset ${offset} exceeds editor text length ${length}`);
        }
        return [point.node, offset - point.start];
      };

      const [startNode, startOffset] = pointAt(offsets.start);
      const [endNode, endOffset] = pointAt(offsets.end);
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      (editor as HTMLElement).focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    },
    { start, end },
  );
}

function html(page: Page) {
  return page.locator(OUTPUT);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(EDITOR)).toBeVisible();
});

test.describe('inline marks', () => {
  for (const { name, tag } of [
    { name: 'Bold', tag: 'strong' },
    { name: 'Italic', tag: 'em' },
    { name: 'Underline', tag: 'u' },
    { name: 'Strikethrough', tag: 's' },
  ]) {
    test(`${name} wraps selection in <${tag}>`, async ({ page }) => {
      await typeFresh(page, 'mark me');
      await selectAll(page);
      await page.getByRole('button', { name }).click();
      await expect(html(page)).toContainText(`<${tag}>mark me</${tag}>`);
    });

    test(`${name} unwraps when toggled twice`, async ({ page }) => {
      await typeFresh(page, 'toggle me');
      await selectAll(page);
      await page.getByRole('button', { name }).click();
      await expect(html(page)).toContainText(`<${tag}>`);
      await selectAll(page);
      await page.getByRole('button', { name }).click();
      await expect(html(page)).not.toContainText(`<${tag}>`);
      await expect(html(page)).toContainText('toggle me');
    });
  }
});

test.describe('inline marks keep valid structure', () => {
  test('bold stays inside the paragraph', async ({ page }) => {
    await typeFresh(page, 'inside p');
    await selectAll(page);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('<p><strong>inside p</strong></p>');
    await expect(html(page)).not.toContainText('<strong><p>');
  });

  test('bold across two paragraphs marks each separately', async ({ page }) => {
    await typeFresh(page, 'first');
    await page.keyboard.press('Enter');
    await page.keyboard.type('second');
    await selectAll(page);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('<p><strong>first</strong></p>');
    await expect(html(page)).toContainText('<p><strong>second</strong></p>');
  });

  test('bold on part of a word leaves the rest unformatted', async ({ page }) => {
    await typeFresh(page, 'abcdef');
    await selectTextRange(page, 2, 4);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('ab<strong>cd</strong>ef');
  });

  test('unbolding part of a bold run keeps the rest bold', async ({ page }) => {
    await typeFresh(page, 'abcdef');
    await selectAll(page);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('<strong>abcdef</strong>');

    await selectTextRange(page, 2, 4);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('<strong>ab</strong>cd<strong>ef</strong>');
  });
});

test.describe('block styles', () => {
  for (const { label, tag } of [
    { label: 'Heading 1', tag: 'h1' },
    { label: 'Heading 2', tag: 'h2' },
    { label: 'Heading 3', tag: 'h3' },
    { label: 'Quote', tag: 'blockquote' },
  ]) {
    test(`applies ${label} as <${tag}>`, async ({ page }) => {
      await typeFresh(page, 'a block');
      await page.getByLabel('Paragraph style').selectOption({ label });
      await expect(html(page)).toContainText(`<${tag}>a block</${tag}>`);
    });
  }

  test('returns a heading back to paragraph', async ({ page }) => {
    await typeFresh(page, 'back to p');
    await page.getByLabel('Paragraph style').selectOption({ label: 'Heading 1' });
    await expect(html(page)).toContainText('<h1>');
    await page.getByLabel('Paragraph style').selectOption({ label: 'Paragraph' });
    await expect(html(page)).toContainText('<p>back to p</p>');
  });
});

test.describe('alignment', () => {
  for (const { label, css } of [
    { label: 'Center', css: 'center' },
    { label: 'Right', css: 'right' },
    { label: 'Justify', css: 'justify' },
  ]) {
    test(`aligns ${label}`, async ({ page }) => {
      await typeFresh(page, 'align me');
      await page.getByLabel('Text alignment').selectOption({ label });
      await expect(html(page)).toContainText(`text-align: ${css}`);
    });
  }
});

test.describe('direction', () => {
  test('switches to RTL', async ({ page }) => {
    await typeFresh(page, 'שלום עולם');
    await page.getByRole('button', { name: 'Right to left' }).click();
    await expect(html(page)).toContainText('dir="rtl"');
  });

  test('switches back to LTR', async ({ page }) => {
    await typeFresh(page, 'hello');
    await page.getByRole('button', { name: 'Right to left' }).click();
    await expect(html(page)).toContainText('dir="rtl"');
    await page.getByRole('button', { name: 'Left to right' }).click();
    await expect(html(page)).toContainText('dir="ltr"');
    await expect(html(page)).not.toContainText('dir="rtl"');
  });
});

test.describe('lists', () => {
  test('creates a bullet list', async ({ page }) => {
    await typeFresh(page, 'item');
    await page.getByRole('button', { name: 'Bullet list' }).click();
    await expect(html(page)).toContainText('<ul><li>item</li></ul>');
  });

  test('creates a numbered list', async ({ page }) => {
    await typeFresh(page, 'item');
    await page.getByRole('button', { name: 'Numbered list' }).click();
    await expect(html(page)).toContainText('<ol><li>item</li></ol>');
  });

  test('converts bullet list to numbered list', async ({ page }) => {
    await typeFresh(page, 'item');
    await page.getByRole('button', { name: 'Bullet list' }).click();
    await page.getByRole('button', { name: 'Numbered list' }).click();
    await expect(html(page)).toContainText('<ol>');
    await expect(html(page)).not.toContainText('<ul>');
  });

  test('removes a list when toggled off', async ({ page }) => {
    await typeFresh(page, 'item');
    await page.getByRole('button', { name: 'Bullet list' }).click();
    await expect(html(page)).toContainText('<ul>');
    await page.getByRole('button', { name: 'Bullet list' }).click();
    await expect(html(page)).not.toContainText('<ul>');
    await expect(html(page)).toContainText('item');
  });
});

test.describe('colors', () => {
  test('applies a text color', async ({ page }) => {
    await typeFresh(page, 'colored');
    await selectAll(page);
    await page.getByRole('button', { name: 'Text color', exact: true }).click();
    await page.getByRole('button', { name: 'Text color #e11d48' }).click();
    await expect(html(page)).toContainText('color: rgb(225, 29, 72)');
    await expect(html(page)).toContainText('colored');
  });

  test('applies a highlight color', async ({ page }) => {
    await typeFresh(page, 'highlighted');
    await selectAll(page);
    await page.getByRole('button', { name: 'Highlight color', exact: true }).click();
    await page.getByRole('button', { name: 'Highlight color #2563eb' }).click();
    await expect(html(page)).toContainText('background-color: rgb(37, 99, 235)');
    await expect(html(page)).toContainText('highlighted');
  });
});

test.describe('link', () => {
  test('adds a link to the selected text', async ({ page }) => {
    await typeFresh(page, 'click here');
    await selectAll(page);
    await page.getByRole('button', { name: 'Insert link' }).click();
    await page.getByLabel('Link URL').fill('https://example.com');
    await page.getByRole('button', { name: 'Apply link' }).click();
    await expect(html(page)).toContainText('href="https://example.com"');
    await expect(html(page)).toContainText('click here');
  });

  test('edits an existing link', async ({ page }) => {
    await typeFresh(page, 'link text');
    await selectAll(page);
    await page.getByRole('button', { name: 'Insert link' }).click();
    await page.getByLabel('Link URL').fill('https://one.example');
    await page.getByRole('button', { name: 'Apply link' }).click();
    await expect(html(page)).toContainText('https://one.example');

    await selectAll(page);
    await page.getByRole('button', { name: 'Insert link' }).click();
    await page.getByLabel('Link URL').fill('https://two.example');
    await page.getByRole('button', { name: 'Apply link' }).click();
    await expect(html(page)).toContainText('https://two.example');
    await expect(html(page)).not.toContainText('https://one.example');
  });

  test('removes a link', async ({ page }) => {
    await typeFresh(page, 'unlink me');
    await selectAll(page);
    await page.getByRole('button', { name: 'Insert link' }).click();
    await page.getByLabel('Link URL').fill('https://example.com');
    await page.getByRole('button', { name: 'Apply link' }).click();
    await expect(html(page)).toContainText('<a');

    await selectAll(page);
    await page.getByRole('button', { name: 'Insert link' }).click();
    await page.getByRole('button', { name: 'Remove link' }).click();
    await expect(html(page)).not.toContainText('<a');
    await expect(html(page)).toContainText('unlink me');
  });
});

test.describe('image', () => {
  test('uploads and inserts an image', async ({ page }) => {
    await typeFresh(page, 'with image');
    await page.getByRole('button', { name: 'Insert image' }).click();
    await page.locator('input[type=file]').setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(html(page)).toContainText('<img', { timeout: 5000 });
    // Upload finished: placeholder marker gone, src replaced with handler URL
    await expect(html(page)).not.toContainText('data-rte-uploading');
    await expect(html(page)).not.toContainText('blob:');
  });
});

test.describe('table', () => {
  /** Open the picker and insert a table of the given size via the number inputs. */
  async function insertTable(
    page: Page,
    rows: number,
    columns: number,
    header = false,
  ): Promise<void> {
    await page.getByRole('button', { name: 'Insert table' }).click();
    await page.getByLabel('Table rows').fill(String(rows));
    await page.getByLabel('Table columns').fill(String(columns));
    const headerBox = page.getByLabel('Header row');
    if (header) {
      await headerBox.check();
    } else {
      await headerBox.uncheck();
    }
    await page.getByRole('button', { name: 'Insert table of the chosen size' }).click();
  }

  function count(output: string, tag: string): number {
    return output.match(new RegExp(`<${tag}[ >]`, 'g'))?.length ?? 0;
  }

  /** Poll the serialized output, which updates a tick after the click. */
  async function expectShape(
    page: Page,
    shape: { tr?: number; td?: number; th?: number },
  ): Promise<void> {
    await expect
      .poll(async () => {
        const output = (await html(page).textContent()) ?? '';
        const actual: Record<string, number> = {};
        for (const tag of Object.keys(shape)) {
          actual[tag] = count(output, tag);
        }
        return actual;
      })
      .toEqual(shape);
  }

  test('picks a size from the hover grid', async ({ page }) => {
    await typeFresh(page, 'grid pick');
    await page.getByRole('button', { name: 'Insert table' }).click();
    await page.getByLabel('Header row').uncheck();
    await page.getByRole('button', { name: 'Insert 2 by 4 table' }).hover();
    await expect(page.locator('.ngx-rte-toolbar__grid-label')).toHaveText('2 × 4');
    await page.getByRole('button', { name: 'Insert 2 by 4 table' }).click();

    await expectShape(page, { tr: 2, td: 8 });
  });

  test('inserts a large table from the number inputs', async ({ page }) => {
    await typeFresh(page, 'big table');
    await insertTable(page, 12, 7);
    await expectShape(page, { tr: 12, td: 84 });
  });

  test('adds a header row when requested', async ({ page }) => {
    await typeFresh(page, 'header table');
    await insertTable(page, 3, 3, true);

    await expect(html(page)).toContainText('<thead>');
    // The header takes one of the three rows
    await expectShape(page, { tr: 3, th: 3, td: 6 });
  });

  test('clamps sizes above the configured maximum', async ({ page }) => {
    await typeFresh(page, 'clamped');
    await insertTable(page, 999, 999);
    await expectShape(page, { tr: 50, td: 50 * 20 });
  });

  test('table is inserted as a sibling, never nested in a paragraph', async ({ page }) => {
    await typeFresh(page, 'before and after');
    await insertTable(page, 2, 2);
    await expect(html(page)).toContainText('<p>before and after</p><table>');
    await expect(html(page)).not.toContainText('<p>before and after<table>');
  });

  test('leaves no empty paragraph when the caret is at the start', async ({ page }) => {
    await typeFresh(page, 'after table');
    await page.locator(EDITOR).click();
    await page.keyboard.press('Home');
    await insertTable(page, 2, 2);

    await expect(html(page)).toContainText('<table>');
    await expect(html(page)).not.toContainText('<p></p>');
    await expect(html(page)).toContainText('<p>after table</p>');
  });

  test('splits the paragraph when the caret is mid-text', async ({ page }) => {
    await typeFresh(page, 'headtail');
    await selectTextRange(page, 4);
    await insertTable(page, 2, 2);

    await expect(html(page)).toContainText('<p>head</p>');
    await expect(html(page)).toContainText('<p>tail</p>');
  });

  test('adds rows above and below the caret', async ({ page }) => {
    await typeFresh(page, 'rows');
    await insertTable(page, 2, 2);
    await page.locator(`${EDITOR} td`).first().click();

    await page.getByRole('button', { name: 'Insert row below' }).click();
    await page.getByRole('button', { name: 'Insert row above' }).click();

    await expectShape(page, { tr: 4, td: 8 });
  });

  test('adds columns left and right of the caret', async ({ page }) => {
    await typeFresh(page, 'columns');
    await insertTable(page, 2, 2);
    await page.locator(`${EDITOR} td`).first().click();

    await page.getByRole('button', { name: 'Insert column right' }).click();
    await page.getByRole('button', { name: 'Insert column left' }).click();

    await expectShape(page, { tr: 2, td: 8 });
  });

  test('grows a table well beyond its original size', async ({ page }) => {
    await typeFresh(page, 'grow');
    await insertTable(page, 2, 2);
    await page.locator(`${EDITOR} td`).first().click();

    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Insert row below' }).click();
      await page.getByRole('button', { name: 'Insert column right' }).click();
    }

    await expectShape(page, { tr: 7, td: 49 });
  });

  test('new columns extend the header row too', async ({ page }) => {
    await typeFresh(page, 'header grow');
    await insertTable(page, 3, 2, true);
    await page.locator(`${EDITOR} td`).first().click();
    await page.getByRole('button', { name: 'Insert column right' }).click();

    await expectShape(page, { tr: 3, th: 3, td: 6 });
  });

  test('deletes a row and a column', async ({ page }) => {
    await typeFresh(page, 'delete');
    await insertTable(page, 3, 3);
    await page.locator(`${EDITOR} td`).first().click();

    await page.getByRole('button', { name: 'Delete row' }).click();
    await expectShape(page, { tr: 2, td: 6 });

    await page.getByRole('button', { name: 'Delete column' }).click();
    await expectShape(page, { tr: 2, td: 4 });
  });

  test('deletes the whole table', async ({ page }) => {
    await typeFresh(page, 'gone');
    await insertTable(page, 3, 3);
    await page.locator(`${EDITOR} td`).first().click();
    await page.getByRole('button', { name: 'Delete table' }).click();
    await expect(html(page)).not.toContainText('<table>');
    await expect(html(page)).toContainText('gone');
  });

  test('row and column controls only appear inside a table', async ({ page }) => {
    await typeFresh(page, 'outside');
    await expect(page.getByRole('button', { name: 'Insert row above' })).toHaveCount(0);

    await insertTable(page, 2, 2);
    await page.locator(`${EDITOR} td`).first().click();
    await expect(page.getByRole('button', { name: 'Insert row above' })).toBeVisible();
  });

  test('typing into cells keeps the table structure', async ({ page }) => {
    await typeFresh(page, 'typed');
    await insertTable(page, 2, 2);
    await page.locator(`${EDITOR} td`).first().click();
    await page.keyboard.type('A1');
    await page.locator(`${EDITOR} td`).nth(3).click();
    await page.keyboard.type('B2');

    await expect(html(page)).toContainText('A1');
    await expect(html(page)).toContainText('B2');
    await expectShape(page, { tr: 2, td: 4 });
  });

  test('undo removes an inserted table', async ({ page }) => {
    await typeFresh(page, 'undo table');
    await insertTable(page, 3, 3);
    await expect(html(page)).toContainText('<table>');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(html(page)).not.toContainText('<table>');
    await expect(html(page)).toContainText('undo table');
  });
});

test.describe('source view', () => {
  test('shows HTML source and applies edits back', async ({ page }) => {
    await typeFresh(page, 'source test');
    await page.getByRole('button', { name: 'HTML source' }).click();
    const source = page.locator('.ngx-rte__source');
    await expect(source).toBeVisible();
    await expect(source).toHaveValue(/source test/);

    await source.fill('<p><strong>edited in source</strong></p>');
    await page.getByRole('button', { name: 'HTML source' }).click();
    await expect(page.locator(EDITOR)).toBeVisible();
    await expect(html(page)).toContainText('<strong>edited in source</strong>');
  });
});

test.describe('fullscreen', () => {
  test('toggles fullscreen class', async ({ page }) => {
    const editorHost = page.locator('ngx-rte');
    await page.getByRole('button', { name: 'Fullscreen' }).click();
    await expect(editorHost).toHaveClass(/ngx-rte--fullscreen/);
    await page.getByRole('button', { name: 'Fullscreen' }).click();
    await expect(editorHost).not.toHaveClass(/ngx-rte--fullscreen/);
  });
});

test.describe('clear formatting', () => {
  test('strips marks from the selection', async ({ page }) => {
    await typeFresh(page, 'formatted text');
    await selectAll(page);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('<strong>');
    await selectAll(page);
    await page.getByRole('button', { name: 'Clear formatting' }).click();
    await expect(html(page)).not.toContainText('<strong>');
    await expect(html(page)).toContainText('<p>formatted text</p>');
  });

  test('keeps the block wrapper for a heading', async ({ page }) => {
    await typeFresh(page, 'heading text');
    await page.getByLabel('Paragraph style').selectOption({ label: 'Heading 2' });
    await selectAll(page);
    await page.getByRole('button', { name: 'Bold' }).click();
    await selectAll(page);
    await page.getByRole('button', { name: 'Clear formatting' }).click();
    await expect(html(page)).toContainText('<h2>heading text</h2>');
  });
});

test.describe('history', () => {
  test('undo reverts a command and redo re-applies it', async ({ page }) => {
    await typeFresh(page, 'undo target');
    await selectAll(page);
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(html(page)).toContainText('<strong>');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(html(page)).not.toContainText('<strong>');
    await expect(html(page)).toContainText('undo target');

    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(html(page)).toContainText('<strong>');
  });
});
