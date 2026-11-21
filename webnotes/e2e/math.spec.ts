import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

const source = (page: Page) => page.getByRole('textbox', { name: 'LaTeX source' });
const body = (page: Page) => page.getByRole('textbox', { name: 'Note body' });
const formulas = (page: Page) => body(page).getByRole('button', { name: 'Edit formula' });

async function openNote(page: Page) {
  await page.goto('/n/note-1');
  await expect(body(page)).toBeEditable();
  await body(page).focus();
}

async function pasteMarkdown(page: Page, markdown: string) {
  await body(page).evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, markdown);
}

function savedBody(page: Page) {
  return page.evaluate(() => {
    const notes = JSON.parse(localStorage.getItem('webnotes_notes_v1') ?? '[]');
    return notes.find((note: { id: string }) => note.id === 'note-1')?.content;
  });
}

test('1: block draft saves on outside click and survives reload', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('$$ ');
  await source(page).fill('\\frac{a}{b}');
  await page.locator('#note-editor-root .note-meta').click();
  await expect(source(page)).toBeHidden();
  await expect(formulas(page)).toHaveCount(1);
  await expect.poll(() => savedBody(page)).toContain('data-latex="\\frac{a}{b}"');
  await page.reload();
  await formulas(page).click();
  await expect(source(page)).toHaveValue('\\frac{a}{b}');
});

test('2: block delimiter, shortcut and slash command focus the source', async ({ page }) => {
  await openNote(page);
  for (const shortcut of ['$$ ', 'Control+Shift+m', '/math']) {
    if (shortcut.startsWith('Control')) await page.keyboard.press(shortcut);
    else await page.keyboard.type(shortcut);
    if (shortcut === '/math') {
      await page.getByRole('option', { name: 'Math block' }).click();
    }
    await expect(source(page)).toBeFocused();
    await page.keyboard.type('x');
    await expect(source(page)).toHaveValue('x');
    await page.keyboard.press('Escape');
  }
});

test('3: typing after inline save continues in the note', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Before ');
  await page.keyboard.press('Control+m');
  await expect(source(page)).toBeFocused();
  await page.keyboard.type('x^2');
  await page.keyboard.press('Enter');
  await expect(body(page)).toBeFocused();
  await page.keyboard.type(' next');
  await expect(body(page).locator('p')).toHaveText(/Before .* next/);
  await expect(page).toHaveURL(/\/n\/note-1$/);
});

test('4: clicking the formula focuses source and select-all stays in it', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Keep $x^2$ this text');
  await formulas(page).click();
  await expect(source(page)).toBeFocused();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('q^3');
  await page.keyboard.press('Enter');
  await expect(body(page)).toContainText(/Keep .* this text/);
  await formulas(page).click();
  await expect(source(page)).toHaveValue('q^3');
});

test('5: typography leaves typed LaTeX verbatim', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type(`$x^2 -> y$ $1/2$ $a -- "b"$`);
  for (const [index, latex] of ['x^2 -> y', '1/2', 'a -- "b"'].entries()) {
    await formulas(page).nth(index).click();
    await expect(source(page)).toHaveValue(latex);
    await page.keyboard.press('Escape');
  }
  await page.keyboard.press('End');
  await page.keyboard.type(' 1/2 ');
  await expect(body(page)).toContainText('½');
});

test('6: currencies and whitespace at inline delimiters stay literal', async ({ page }) => {
  await openNote(page);
  const text = 'I paid $5 and $10 today. $a$2 and $ b$ and $c $.';
  await page.keyboard.type(text);
  await expect(body(page)).toHaveText(text);
  await expect(formulas(page)).toHaveCount(0);
});

test('7: dismissing empty inline source removes only the formula', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Keep this');
  await page.keyboard.press('Control+m');
  await expect(source(page)).toBeFocused();
  await page.getByRole('textbox', { name: 'Note title' }).click();
  await expect(source(page)).toBeHidden();
  await expect(body(page).locator('[data-formula]')).toHaveCount(0);
  await expect(body(page)).toHaveText('Keep this');
});

test('8: copy and download serialize both formula types as Markdown', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openNote(page);
  const markdown = 'Euler $e^{i\\pi}+1=0$ here.\n\n$$\n\\frac{a}{b}\n$$';
  await pasteMarkdown(page, markdown);
  await expect.poll(() => savedBody(page)).toContain('data-type="math-block"');

  const share = page.getByRole('button', { name: 'Share note' });
  await share.click();
  await page.getByRole('menuitem', { name: 'Copy as Markdown' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(markdown);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).not.toContain('data-latex=');

  await share.click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download Markdown' }).click();
  const download = await downloadEvent;
  expect(await readFile(await download.path(), 'utf8')).toBe(copied);
});

test('8–9: source with line breaks and ambiguous delimiters round-trips', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openNote(page);
  await page.keyboard.press('Control+m');
  const latex = ' x^2\n+ 1 & &#36; \\ ';
  await source(page).fill(latex);
  await page.keyboard.press('Enter');
  await page.keyboard.type('2');
  await expect.poll(() => savedBody(page)).toContain('data-type="math-inline"');

  await page.getByRole('button', { name: 'Share note' }).click();
  await page.getByRole('menuitem', { name: 'Copy as Markdown' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('$');
  const markdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(markdown).not.toContain('data-latex=');
  await body(page).focus();
  await page.keyboard.press('Control+a');
  await pasteMarkdown(page, markdown);
  await expect(formulas(page)).toHaveCount(1);
  await formulas(page).click();
  await expect(source(page)).toHaveValue(latex);
});

test('9: Markdown paste creates math nodes and leaves code literal', async ({ page }) => {
  await openNote(page);
  await pasteMarkdown(page, 'Euler $e^{i\\pi}+1=0$ here, beside `$x$`.\n\n$$\n\\frac{a}{b}\n$$');
  await expect(body(page).locator('[data-formula="inline"] .katex')).toHaveCount(1);
  await expect(body(page).locator('[data-formula="block"] .katex')).toHaveCount(1);
  await expect(body(page).locator('code')).toHaveText('$x$');
  await formulas(page).first().click();
  await expect(source(page)).toHaveValue('e^{i\\pi}+1=0');
});

test('10: left and right arrows select the inline atom and Enter opens it', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Euler $x^2$');
  await page.keyboard.press('ArrowLeft');
  await expect(formulas(page)).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(formulas(page)).not.toHaveAttribute('data-selected');
  await page.keyboard.press('ArrowRight');
  await expect(formulas(page)).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(source(page)).toBeFocused();
  await expect(source(page)).toHaveValue('x^2');
});

test('11: Escape restores the saved formula and one undo reverts one edit', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Before $x^2$');
  await formulas(page).click();
  await source(page).fill('q');
  await page.keyboard.press('Escape');
  await formulas(page).click();
  await expect(source(page)).toHaveValue('x^2');
  await source(page).fill('y^3');
  await page.keyboard.press('Enter');
  await page.keyboard.type(' tail');
  await page.keyboard.press('Control+z');
  await expect(body(page)).not.toContainText('tail');
  await page.keyboard.press('Control+z');
  await expect(body(page)).toContainText('Before');
  await formulas(page).click();
  await expect(source(page)).toHaveValue('x^2');
});

test('12: shared popover preserves layout and supports multiline source', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Before $x^2$ after');
  const formula = formulas(page);
  const before = await formula.boundingBox();
  await formula.click();
  const inline = page.getByRole('dialog', { name: 'Inline equation' });
  await expect(inline).toHaveAttribute('data-depth', 'popover');
  await expect(formula).toBeVisible();
  await expect(source(page)).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('+ 1');
  await expect(source(page)).toHaveValue('x^2\n+ 1');
  expect(await formula.boundingBox()).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(inline).toBeHidden();

  await page.keyboard.press('Control+Shift+m');
  const block = page.getByRole('dialog', { name: 'Block equation' });
  await expect(block).toHaveAttribute('data-depth', 'popover');
  await page.keyboard.type('a');
  await page.keyboard.press('Enter');
  await page.keyboard.type('+ b');
  await expect(source(page)).toHaveValue('a\n+ b');
  await page.keyboard.press('Control+Enter');
  await expect(block).toBeHidden();
  await expect(body(page)).toBeFocused();
});

test('13: invalid drafts keep the last render and show a short error', async ({ page }) => {
  await openNote(page);
  await pasteMarkdown(page, '$$\n\\frac{a}{b}\n$$');
  await formulas(page).click();
  const popup = page.getByRole('dialog', { name: 'Block equation' });
  const good = popup.locator('.katex');
  const goodHTML = await good.innerHTML();
  await source(page).fill('\\frac{a}');
  await expect(popup.getByRole('status')).toHaveText('Missing }');
  expect(await good.innerHTML()).toBe(goodHTML);
  await popup.getByRole('button', { name: 'Done' }).click();
  const invalid = formulas(page).getByText('\\frac{a}', { exact: true });
  await expect(invalid).toHaveCSS('text-decoration-style', 'wavy');
  await expect(invalid).toHaveCSS('font-family', /mono/i);
});

test('14: source has at least 4.5:1 contrast and the popover fits the viewport', async ({ page }) => {
  await openNote(page);
  await page.keyboard.type('Inline $x^2$');
  await formulas(page).click();
  const field = source(page);
  await expect(field).toBeFocused();
  const contrast = await field.evaluate(el => {
    const style = getComputedStyle(el);
    const luminance = (color: string) => {
      const rgba = color.match(/[\d.]+/g);
      if (!rgba || rgba.length !== 3) throw new Error(`Expected opaque RGB, got ${color}`);
      const [r, g, b] = rgba.map(Number).map(value => value / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const colors = [luminance(style.color), luminance(style.backgroundColor)];
    return (Math.max(...colors) + 0.05) / (Math.min(...colors) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await expect.poll(() => page.getByRole('dialog', { name: 'Inline equation' }).evaluate(el => {
    const { left, top, right, bottom } = el.getBoundingClientRect();
    return left >= 10 && top >= 10 && right <= innerWidth - 10 && bottom <= innerHeight - 10;
  })).toBe(true);
});

test('15: wall cards show rendered math without LaTeX commands in the visible text', async ({ page }) => {
  await openNote(page);
  await pasteMarkdown(page, 'The sum $\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$ is useful.');
  await expect.poll(() => savedBody(page)).toContain('data-type="math-inline"');
  await page.goto('/');
  const card = page.locator('.note-card').filter({ hasText: 'The sum' });
  await expect(card.locator('.katex-html')).toBeVisible();
  await expect(card.locator('.katex-html')).toContainText('∑');
  expect(await card.innerText()).not.toMatch(/\\sum|\\frac/);
});

test('16: block actions work from the keyboard, including an empty stored block', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openNote(page);
  await body(page).evaluate(el => {
    const data = new DataTransfer();
    data.setData('text/html', '<div data-type="math-block" data-latex=""></div>');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const empty = body(page).getByRole('button', { name: 'Add formula' });
  await empty.focus();
  await page.keyboard.press('Enter');
  await expect(source(page)).toBeFocused();
  await source(page).fill('x+y');
  await page.keyboard.press('Control+Enter');
  await formulas(page).focus();
  await page.keyboard.press('Tab');
  await expect(body(page).getByRole('button', { name: 'Copy to clipboard' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('x+y');
});

test('18: the help reference describes the actual math editor', async ({ page }) => {
  await page.keyboard.press('Control+/');
  const help = page.getByRole('dialog');
  await expect(help.getByText(/Click outside to save/)).toBeVisible();
  await expect(help.getByText(/auto-replacements/)).toHaveCount(0);
});
