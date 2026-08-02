import { test, expect, Locator, Page } from '@playwright/test';

// The demo page hosts several editors; these tests drive the value-model one.
const DEMO = '#value-demo';

/** Root of the editor under test, so controls never match a sibling editor. */
function demo(page: Page): Locator {
  return page.locator(DEMO);
}

test.describe('ngx-richtext demo', () => {
  test('loads editor and formats bold text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ngx-richtext' })).toBeVisible();

    const editor = demo(page).locator('.ngx-rte__content');
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Hello bold world');
    await page.keyboard.press('ControlOrMeta+A');
    await demo(page).getByRole('button', { name: 'Bold' }).click();

    await expect(demo(page).locator('.demo__preview pre')).toContainText('<strong>');
  });

  test('creates a bullet list from the toolbar', async ({ page }) => {
    await page.goto('/');
    const editor = demo(page).locator('.ngx-rte__content');
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Item one');
    await demo(page).getByRole('button', { name: 'Bullet list' }).click();
    await expect(demo(page).locator('.demo__preview pre')).toContainText('<ul>');
  });

  test('shows premium color controls when licensed', async ({ page }) => {
    await page.goto('/');
    await expect(demo(page).getByRole('button', { name: 'Text color' })).toBeVisible();
    await expect(demo(page).getByRole('button', { name: 'Insert table' })).toBeVisible();
  });

  test('can switch block to RTL for Hebrew', async ({ page }) => {
    await page.goto('/');
    const editor = demo(page).locator('.ngx-rte__content');
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('שלום עולם');
    await demo(page).getByRole('button', { name: 'Right to left' }).click();
    await expect(demo(page).locator('.demo__preview pre')).toContainText('dir="rtl"');
  });
});
