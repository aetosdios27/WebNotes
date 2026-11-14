import type { Locator, Page } from '@playwright/test';
import { test, expect, report, longTitle, type Violation } from './fixtures';
import { concepts, smallTargetAllowlist } from './registry';

const interactive = 'button, a[href], [role="tab"], [role^="menuitem"], input, select, textarea, [tabindex="0"]';
const labelled = 'button, [role="tab"], [role^="menuitem"]';
async function name(control: Locator) {
  return await control.getAttribute('aria-label') || (await control.innerText()).trim().replace(/\s+/g, ' ') || await control.getAttribute('title') || (await control.textContent())?.trim() || '(unnamed)';
}
async function colours(control: Locator, state: string): Promise<Violation[]> {
  const label = await name(control);
  return control.evaluate((element, { label, state }) => {
    const failures: Violation[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const labels: Element[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent?.trim() && node.parentElement && !node.parentElement.closest('svg, kbd, .sr-only')) labels.push(node.parentElement);
    }
    if (!labels.length) return failures;
    for (const [i, icon] of Array.from(element.querySelectorAll('svg.lucide')).entries()) {
      // Metadata icons belong to their own label, rather than a card's title.
      const parent = icon.parentElement;
      const text = labels.find(label => label === parent || parent?.contains(label)) || labels[0];
      const expected = getComputedStyle(text).color;
      const actual = getComputedStyle(icon).color;
      if (actual !== expected) failures.push({ id: `${state}: ${label} icon ${i}`, expected, actual });
    }
    return failures;
  }, { label, state });
}
async function hoverColours(root: Locator, failures: Violation[], state: string, reopen?: () => Promise<void>) {
  const controls = root.locator(labelled).filter({ has: root.page().locator('svg.lucide') });
  for (const control of await controls.all()) {
    if (reopen) { await root.page().keyboard.press('Escape'); await root.page().keyboard.press('Escape'); await reopen(); }
    if (!await control.isVisible() || await control.isDisabled()) continue;
    await control.hover();
    if ((await control.getAttribute('role'))?.startsWith('menuitem')) await expect(control).toHaveAttribute('data-highlighted', '');
    await control.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
    failures.push(...await colours(control, state));
  }
}
async function openMore(page: Page) {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(page.getByRole('menu').first()).toBeVisible();
  if (process.env.UI_MUTATION === 'duplicates') await page.getByRole('menu').first().evaluate(el => {
    const item = document.createElement('div'); item.role = 'menuitem'; item.textContent = 'Theme'; el.append(item);
  });
}
async function openContext(page: Page) {
  await page.locator('.note-card').first().click({ button: 'right' });
  await expect(page.getByRole('menu').first()).toBeVisible();
}

test('A icon and label agree on hover, Tab focus and menu highlight', async ({ page }) => {
  const failures: Violation[] = [];
  await hoverColours(page.locator('body'), failures, 'hover');
  await page.mouse.move(0, 0);
  // Reach controls through actual Tab navigation, including controls below the fold.
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const visited = new Set<string>();
  for (let i = 0; i < 140; i++) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible');
    if (!await focused.count()) continue;
    const key = await name(focused);
    if (visited.has(key)) break;
    visited.add(key);
    if (await focused.locator('svg.lucide').count()) failures.push(...await colours(focused, 'focus-visible'));
  }
  expect(visited.size, 'Tab must exercise keyboard focus').toBeGreaterThan(3);
  for (const open of [openMore, openContext]) {
    await page.keyboard.press('Escape');
    await open(page);
    await hoverColours(page.locator('[role="menu"]').first(), failures, open === openMore ? 'more highlight' : 'context highlight', () => open(page));
    await page.keyboard.press('Escape');
  }
  report('A', failures);
});

test('B disabled controls stay inert on hover', async ({ page }) => {
  const failures: Violation[] = [];
  const disabled = page.locator(`${interactive.split(', ').map(s => `${s}:disabled`).join(', ')}, [aria-disabled="true"]`);
  expect(await disabled.count()).toBeGreaterThan(0);
  for (const control of await disabled.all()) {
    if (!await control.isVisible()) continue;
    await page.mouse.move(0, 0);
    const paint = () => control.evaluate(el => [el, ...el.querySelectorAll('svg, span')].map(node => { const s = getComputedStyle(node); return [s.color, s.backgroundColor]; }));
    const before = await paint();
    await control.hover({ force: true });
    await control.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
    const after = await paint();
    if (JSON.stringify(before) !== JSON.stringify(after)) failures.push({ id: await name(control), expected: JSON.stringify(before), actual: JSON.stringify(after) });
  }
  report('B', failures);
});

test('C interactive hit targets', async ({ page }) => {
  const failures: Violation[] = [];
  async function scan(root: Locator) {
    for (const control of await root.locator(interactive).all()) {
      if (!await control.isVisible()) continue;
      const titleBar = await control.evaluate(el => !!el.closest('.window-bar'));
      const iconOnly = !(await control.innerText()).trim();
      if (!titleBar && !iconOnly) continue;
      if (!titleBar && await control.evaluate((el, allowlist) => Object.keys(allowlist).some(selector => el.matches(selector)), smallTargetAllowlist)) continue;
      const box = await control.boundingBox();
      const minimum = titleBar ? 32 : 24;
      if (box && (box.width < minimum || box.height < minimum)) failures.push({ id: await name(control), expected: `>= ${minimum}×${minimum}`, actual: `${box.width}×${box.height}` });
    }
  }
  await scan(page.locator('.notes-window'));
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeVisible();
  await scan(page.locator('.note-switcher'));
  await page.keyboard.press('Escape');
  await openMore(page);
  await scan(page.getByRole('menu').first());
  await page.keyboard.press('Escape');
  await openContext(page);
  await scan(page.getByRole('menu').first());
  report('C', failures);
});

async function overflow(page: Page, scope: string, state: string): Promise<Violation[]> {
  return page.locator(scope).evaluateAll((roots, state) => roots.flatMap(root => [root, ...root.querySelectorAll('*')].flatMap(el => {
    if (!(el instanceof HTMLElement) || !el.getClientRects().length) return [];
    const style = getComputedStyle(el);
    const directText = Array.from(el.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    if (style.visibility === 'hidden' || !directText || style.overflowX !== 'visible' || el.scrollWidth <= el.clientWidth + 1) return [];
    return [{ id: `${state}: ${el.tagName}.${el.className}: ${el.textContent?.trim().slice(0, 85)}`, expected: `scrollWidth <= ${el.clientWidth}`, actual: `${el.scrollWidth}` }];
  })), state);
}

test('D extreme text fits wall, switcher and menus', async ({ page }) => {
  const failures: Violation[] = [];
  const pageWidth = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, expected: innerWidth }));
  if (pageWidth.actual > pageWidth.expected) failures.push({ id: 'page horizontal scroll', actual: `${pageWidth.actual}`, expected: `${pageWidth.expected}` });
  failures.push(...await overflow(page, '.note-wall', 'wall'));
  const overlap = await page.locator('.note-card').evaluateAll(cards => {
    const failures: Violation[] = [];
    for (const [i, card] of cards.entries()) for (const content of card.querySelectorAll('strong, p, footer')) {
      const a = content.getBoundingClientRect();
      for (const [j, other] of cards.entries()) {
        if (i === j) continue;
        const b = other.getBoundingClientRect();
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) failures.push({ id: `card ${i} content overlaps card ${j}`, expected: 'no intersection', actual: content.textContent || '' });
      }
    }
    return failures;
  });
  failures.push(...overlap);
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill(longTitle);
  await expect(page.getByRole('option').filter({ hasText: longTitle })).toBeVisible();
  failures.push(...await overflow(page, '.note-switcher', 'switcher'));
  await page.keyboard.press('Escape');
  await openMore(page);
  failures.push(...await overflow(page, '[role="menu"]', 'more'));
  await page.keyboard.press('Escape');
  await openContext(page);
  failures.push(...await overflow(page, '[role="menu"]', 'context'));
  await page.getByRole('menuitem', { name: 'Move to', exact: true }).hover();
  await expect(page.getByRole('menuitemradio').first()).toBeVisible();
  failures.push(...await overflow(page, '.note-submenu', 'folder menu'));
  report('D', failures);
});

test('E title bar concepts are not duplicated in More', async ({ page }) => {
  const failures: Violation[] = [];
  const barNames = await Promise.all((await page.locator('.window-bar').locator(interactive).all()).map(name));
  await openMore(page);
  const menuNames = await Promise.all((await page.locator('[role^="menuitem"]').all()).map(name));
  for (const [concept, aliases] of Object.entries(concepts)) {
    const matches = (label: string) => aliases.some(alias => new RegExp(`\\b${alias}\\b`, 'i').test(label));
    if (barNames.some(matches) && menuNames.some(matches)) failures.push({ id: concept, expected: 'one location', actual: `${barNames.filter(matches)} / ${menuNames.filter(matches)}` });
  }
  report('E', failures);
});

for (const signedIn of [false, true]) test(`F title bar clicks have no immediate consequences (${signedIn ? 'account' : 'guest'})`, async ({ page }) => {
  // Network fixture exercises the real account UI without credentials, a database,
  // or a production test hook. Notes remain in the signed-out local adapter.
  if (signedIn) {
    await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { name: 'UI Tester', email: 'ui@example.test' }, expires: '2099-01-01T00:00:00Z' } }));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Account:', exact: false })).toBeVisible();
  }
  const failures: Violation[] = [];
  const signouts: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/auth/signout')) signouts.push(request.url()); });
  const controls = page.locator('.window-bar').locator(interactive);
  const candidates: { index: number; label: string }[] = [];
  for (const [index, control] of (await controls.all()).entries()) if (await control.isVisible() && (!(await control.innerText()).trim() || await control.evaluate(el => el.matches('.account-trigger'))) && await control.isEnabled()) candidates.push({ index, label: await name(control) });
  for (const { index, label } of candidates) {
    await page.keyboard.press('Escape');
    const before = await page.evaluate(() => localStorage.getItem('webnotes_notes_v1'));
    const url = page.url();
    const domBefore = await page.locator('main').innerHTML();
    const theme = await page.locator('html').getAttribute('class');
    await controls.nth(index).click();
    if (page.url() !== url) { failures.push({ id: label, expected: 'no navigation', actual: page.url() }); await page.goto(url); continue; }
    // Home on the wall is intentionally idempotent; all other controls must react.
    if (label !== 'Home') await expect.poll(async () => page.url() !== url || (await page.locator('main').innerHTML({ timeout: 1000 })) !== domBefore || (await page.locator('html').getAttribute('class')) !== theme || await page.locator('[role="menu"], [role="dialog"]').count() > 0).toBe(true);
    if (signouts.length || page.url() !== url || await page.evaluate(() => localStorage.getItem('webnotes_notes_v1')) !== before) failures.push({ id: label, expected: 'no signout, navigation, or note mutation', actual: `signouts=${signouts.length}; url=${page.url()}; notes changed=${await page.evaluate(() => localStorage.getItem('webnotes_notes_v1')) !== before}` });
  }
  report(signedIn ? 'F account' : 'F guest', failures);
});
