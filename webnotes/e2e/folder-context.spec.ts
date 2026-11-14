import { test, expect } from './fixtures';
import type { Locator } from '@playwright/test';

async function expectActiveInView(surface: Locator) {
  const active = surface.locator('.library-folders button[aria-current="true"]');
  await expect(active).toBeVisible();
  await expect.poll(() => active.evaluate(el => {
    const row = el.getBoundingClientRect();
    const list = el.closest('.library-folders')?.getBoundingClientRect();
    if (!list) return false;
    return row.top >= list.top - 1 && row.bottom <= list.bottom + 1;
  })).toBe(true);
}

test('library preserves the selected folder context', async ({ page }, info) => {
  await page.keyboard.press('Control+k');
  await page.locator('.note-switcher input').fill('Folder 29');
  await page.keyboard.press('Enter');
  await expect(page.locator('.note-switcher')).not.toBeVisible();
  if (info.project.name.endsWith('390')) {
    await page.getByRole('button', { name: 'Open folders', exact: true }).click();
    await expectActiveInView(page.locator('.folder-sheet'));
    return;
  }
  const rail = page.locator('.folder-rail');
  await expectActiveInView(rail);
  await page.getByRole('button', { name: 'Collapse library', exact: true }).click();
  await expect(rail.locator('.library-folders button')).toHaveCount(30);
  await expectActiveInView(rail);
  await expect(rail.getByRole('button', { name: 'Folder 29', exact: true })).toHaveAttribute('title', 'Folder 29');
  await page.screenshot({ path: `/tmp/webnotes-rail-${info.project.name}-collapsed.png` });
  await page.getByRole('button', { name: 'Expand library', exact: true }).click();
  await expectActiveInView(rail);
  await page.screenshot({ path: `/tmp/webnotes-rail-${info.project.name}-expanded.png` });
});


test('phone folder sheet yields to navigation and delete confirmation', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('390'), 'Phone sheet only');
  await page.getByRole('button', { name: 'Open folders', exact: true }).click();
  await page.keyboard.press('Control+k');
  await page.locator('.note-switcher input').fill('Folder 29');
  await page.keyboard.press('Enter');
  await expect(page.locator('.folder-sheet')).not.toBeVisible();
  await expect(page.locator('.wall-heading h1')).toHaveText('Folder 29');
  await page.getByRole('button', { name: 'Open folders', exact: true }).click();
  await page.locator('.folder-sheet [data-scope="folder-29"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete folder', exact: true }).click();
  await expect(page.locator('.folder-sheet')).not.toBeVisible();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('alertdialog')).not.toBeVisible();
});
