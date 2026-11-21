import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const menu = (page: Page) => page.getByRole('listbox', { name: 'Insert a block' });

async function openNote(page: Page) {
  await page.goto('/n/note-1');
  const editor = page.getByRole('textbox', { name: 'Note body' });
  await expect(editor).toBeEditable();
  await editor.focus();
  return editor;
}

test('slash menu renders one surface, grouped defaults and readable shortcuts', async ({ page }, info) => {
  const editor = await openNote(page);
  await page.keyboard.type('/');
  const list = menu(page);
  await expect(list).toBeVisible();
  await expect(list.getByRole('group')).toHaveCount(4);
  await expect(list.getByRole('group', { name: 'Basic blocks' }).getByRole('option').first()).toHaveText('Text');
  await expect(list.getByRole('group', { name: 'Math' }).getByRole('option')).toHaveCount(2);
  await expect(list.getByRole('option')).toHaveCount(13);
  await expect(list.getByRole('option', { name: 'Fraction' })).toHaveCount(0);
  await expect(list.getByRole('option', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
  await expect(editor).toHaveAttribute('aria-expanded', 'true');
  expect(await editor.getAttribute('aria-controls')).toBe(await list.getAttribute('id'));

  const metrics = await list.evaluate((box) => {
    const surface = box.closest('[data-depth="popover"]');
    if (!surface) throw new Error('Missing popover surface');
    const ancestors = [];
    for (let el = surface.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      ancestors.push({ background: style.backgroundColor, shadow: style.boxShadow, border: style.borderTopWidth });
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing canvas context');
    const luminance = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(context.getImageData(0, 0, 1, 1).data)
        .map((value) => value / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const background = luminance(getComputedStyle(surface).backgroundColor);
    const contrast = (element: Element) => {
      const fg = luminance(getComputedStyle(element).color);
      return (Math.max(background, fg) + 0.05) / (Math.min(background, fg) + 0.05);
    };

    return {
      ancestors,
      hasTippyChrome: !!surface.closest('[data-tippy-root], .tippy-box') ||
        !!surface.querySelector('.tippy-arrow'),
      hasScrollbar: box.scrollHeight > box.clientHeight,
      rowHeights: Array.from(box.querySelectorAll('[role="option"]'), el => el.getBoundingClientRect().height),
      titleContrast: Math.min(...Array.from(box.querySelectorAll('.slash-title'), contrast)),
      shortcutContrast: Math.min(...Array.from(box.querySelectorAll('kbd'), contrast)),
    };
  });
  expect(metrics.ancestors).toEqual([{ background: 'rgba(0, 0, 0, 0)', shadow: 'none', border: '0px' }]);
  expect(metrics.hasTippyChrome).toBe(false);
  expect(metrics.rowHeights).toEqual(Array(13).fill(32));
  expect(metrics.titleContrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.shortcutContrast).toBeGreaterThanOrEqual(4.5);
  if (info.project.use.viewport?.width === 1280) expect(metrics.hasScrollbar).toBe(false);
});

test('slash menu Escape and empty results let Enter insert a paragraph', async ({ page }) => {
  const editor = await openNote(page);
  const list = menu(page);
  await page.keyboard.type('/div');
  await expect(list.getByRole('option', { name: 'Divider' })).toHaveAttribute('aria-selected', 'true');
  await editor.press('Escape');
  await expect(list).toBeHidden();
  for (const attr of ['aria-controls', 'aria-expanded', 'aria-activedescendant']) {
    await expect(editor).not.toHaveAttribute(attr, /.+/);
  }
  await page.keyboard.type('i');
  await expect(list).toBeHidden();
  await editor.press('Enter');
  await expect(editor.locator(':scope > p')).toHaveCount(2);
  await expect(editor.locator('p').first()).toHaveText('/divi');
  await expect(editor.locator('hr')).toHaveCount(0);

  await page.keyboard.type('/zzz');
  await expect(list.getByRole('status')).toHaveText('No blocks match “zzz”');
  await expect(list.getByRole('option')).toHaveCount(0);
  await editor.press('Enter');
  await expect(editor.locator(':scope > p')).toHaveCount(3);
  await expect(editor.locator(':scope > p').nth(1)).toHaveText('/zzz');

  await page.keyboard.type('/z');
  await expect(list.getByRole('status')).toBeVisible();
  await editor.press('Space');
  await expect(list).toBeHidden();
  await editor.press('Enter');
  await page.keyboard.type('/z');
  await expect(list.getByRole('status')).toBeVisible();
  await page.keyboard.type('zzz');
  await expect(list).toBeHidden();

  await editor.press('Enter');
  await page.keyboard.type('/');
  await expect(list).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(list).toBeHidden();
});

test('slash menu ranks search and keeps the single active option in view', async ({ page }) => {
  const editor = await openNote(page);
  const list = menu(page);
  const options = list.getByRole('option');
  for (const [query, title] of [
    ['frac', 'Fraction'],
    ['h2', 'Heading 2'],
    ['heading 2', 'Heading 2'],
    ['in', 'Inline math'],
    ['2x2', 'Table 2×2'],
    ['argmax', 'Argmax'],
    ['math', 'Math block'],
  ]) {
    await page.keyboard.type(`/${query}`);
    await expect(options.first()).toHaveAccessibleName(title);
    await expect(list.getByRole('group')).toHaveCount(0);
    if (query !== 'math') {
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await expect(list).toBeHidden();
    }
  }

  for (let i = 0; i < 10; i++) await editor.press('ArrowDown');
  const selected = list.locator('[aria-selected="true"]');
  await expect(selected).toHaveCount(1);
  expect(await editor.getAttribute('aria-activedescendant')).toBe(await selected.getAttribute('id'));
  expect(await selected.evaluate((row) => {
    const box = row.closest('[role="listbox"]')?.getBoundingClientRect();
    const { top, bottom } = row.getBoundingClientRect();
    return !!box && top >= box.top && bottom <= box.bottom;
  })).toBe(true);
  expect(await list.evaluate((box) => box.scrollTop)).toBeGreaterThan(0);

  await editor.press('End');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');
  await editor.press('ArrowDown');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await editor.press('ArrowUp');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');
  await editor.press('Home');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('/sum');
  await expect(options.first()).toHaveAccessibleName('Sum');
  await editor.press('Tab');
  await expect(list).toBeHidden();
  await expect(editor).toBeFocused();
  await expect(editor.locator('.math-block-render')).toBeVisible();
});

test('slash menu pointer movement selects the command Enter runs', async ({ page }) => {
  const editor = await openNote(page);
  const list = menu(page);
  await page.keyboard.type('/');
  const heading = list.getByRole('option', { name: 'Heading 2' });
  await heading.hover();
  await expect(heading).toHaveAttribute('aria-selected', 'true');
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(1);
  await editor.press('Enter');
  await expect(list).toBeHidden();
  await expect(editor.locator('h2')).toBeVisible();
  await expect(editor).toBeFocused();
});

test('slash menu flips above the last line of a long note and fits the viewport', async ({ page }) => {
  const editor = await openNote(page);
  for (let i = 0; i < 35; i++) {
    await editor.press('Enter');
    await page.keyboard.insertText('A line in the note');
  }
  await editor.press('Enter');
  await page.keyboard.type('/');
  const list = menu(page);
  await expect(list).toBeVisible();
  await expect.poll(() => list.evaluate((box) => {
    const surface = box.closest('[data-depth="popover"]')?.getBoundingClientRect();
    const caret = document.querySelector('.tiptap .suggestion')?.getBoundingClientRect();
    if (!surface || !caret) return false;
    return surface.top >= 7 && surface.left >= 7 && surface.right <= innerWidth - 7 &&
      surface.bottom <= caret.top && surface.width <= Math.min(300, innerWidth - 32);
  })).toBe(true);
});
