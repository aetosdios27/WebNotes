import { test, expect } from './fixtures';

test('note history restores the time wall and folder URL', async ({ page }, info) => {
  const wall = page.locator('.note-wall');
  await expect(page.locator('.month-scrubber')).toBeVisible();
  const card = page.locator('.note-card').last();
  await card.scrollIntoViewIfNeeded();
  const top = await wall.evaluate(el => el.scrollTop);
  expect(top).toBeGreaterThan(0);
  await card.click();
  await expect(page).toHaveURL(/\/n\//);
  await page.goBack();
  await expect(wall).toBeVisible();
  await expect.poll(() => wall.evaluate(el => el.scrollTop)).toBeCloseTo(top, 0);
  await page.keyboard.press('Control+k');
  await page.locator('.note-switcher input').fill('Folder 29');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\?folder=folder-29$/);
  await page.reload();
  await expect(page.locator('.wall-heading h1')).toHaveText('Folder 29');
  if (info.project.name.endsWith('390'))
    await page.getByRole('button', { name: 'Open folders', exact: true }).click();
  const library = page.locator(info.project.name.endsWith('390') ? '.folder-sheet' : '.folder-rail');
  await expect(library.locator('[data-scope="folder-29"]')).toHaveAttribute('aria-current', 'true');
});
