import type { Locator, Page } from '@playwright/test';
import { test, expect, report, longTitle, nearDuplicates, type Violation } from './fixtures';
import { concepts, navigationAllowlist, smallTargetAllowlist } from './registry';

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
// One Escape may only close a submenu; keep pressing until no menu remains.
async function closeMenus(page: Page) {
  for (let i = 0; i < 3; i++) {
    if (!await page.locator('[role="menu"]').count()) return;
    await page.keyboard.press('Escape');
    await page.locator('[role="menu"]').first().waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
  }
}

// The note side panel, opened like a writer would: a card, then the header's outline toggle.
const sidePanel = 'div:has(> div > [role="tablist"][aria-label="Note panel"])';
async function openPanel(page: Page) {
  await page.locator('.note-card').first().click();
  await expect(page.locator('main')).toHaveClass(/writing/);
  await page.getByRole('button', { name: 'Toggle outline', exact: true }).click();
  await expect(page.locator(sidePanel).locator('.pane-tabs [role="tab"]')).toHaveCount(3);
}

async function showAccount(page: Page) {
  // No cloud user ID: exercise the actual account UI with local notes.
  await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { name: 'UI Tester', email: 'ui@example.test' }, expires: '2099-01-01T00:00:00Z' } }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account:', exact: false })).toBeVisible();
}

// The library is a rail beside the wall, or a sheet behind "Open folders" on a phone.
async function openLibrary(page: Page) {
  const rail = page.locator('.folder-rail');
  if (await rail.isVisible()) return rail;
  await page.getByRole('button', { name: 'Open folders', exact: true }).click();
  const sheet = page.locator('.folder-sheet');
  await expect(sheet).toBeVisible();
  return sheet;
}
async function closeLibrary(page: Page) {
  if (await page.locator('.folder-sheet').isVisible()) await page.keyboard.press('Escape');
  await expect(page.locator('.folder-sheet')).toHaveCount(0);
}
// The selected row must read as selected: its own fill, clearly off the
// surface behind it, and heavier type than its neighbours.
async function selectedRow(library: Locator, state: string): Promise<Violation[]> {
  return library.evaluate((root, state) => {
    // Computed colours are rgb() or, from color-mix(), color(srgb 0–1 channels).
    const parse = (c: string) => {
      const n = (c.match(/[\d.]+/g) || []).map(Number);
      return c.startsWith('color(') ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n;
    };
    const over = (top: number[], bottom: number[]) => {
      const a = top[3] ?? 1;
      return [0, 1, 2].map(i => top[i] * a + bottom[i] * (1 - a)).concat(1);
    };
    const backdrop = (el: Element | null): number[] => {
      const layers: number[][] = [];
      for (; el; el = el.parentElement) {
        const c = parse(getComputedStyle(el).backgroundColor);
        if (c.length && (c[3] ?? 1) > 0) layers.push(c);
        if (c.length && (c[3] ?? 1) === 1) break;
      }
      return layers.reverse().reduce((under, layer) => over(layer, under), [255, 255, 255, 1]);
    };
    const luminance = (c: number[]) => {
      const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const active = root.querySelector('.library-row[aria-current="true"]');
    const other = root.querySelector('.library-row:not([aria-current="true"])');
    if (!active || !other) return [{ id: `${state}: selected row`, expected: 'one selected row among others', actual: 'none' }];
    const fill = backdrop(active), surface = backdrop(active.parentElement);
    const [hi, lo] = [luminance(fill), luminance(surface)].sort((a, b) => b - a);
    const contrast = (hi + 0.05) / (lo + 0.05);
    const failures = [];
    if (contrast < 1.05) failures.push({ id: `${state}: selected row fill`, expected: 'contrast >= 1.05 with the rail', actual: contrast.toFixed(3) });
    const weight = (el: Element) => Number(getComputedStyle(el).fontWeight);
    if (weight(active) <= weight(other)) failures.push({ id: `${state}: selected row weight`, expected: `> ${weight(other)}`, actual: `${weight(active)}` });
    return failures;
  }, state);
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
  // Library: every row and button on hover, the selected row, and folder actions.
  let library = await openLibrary(page);
  failures.push(...await selectedRow(library, 'library'));
  await hoverColours(library, failures, 'library hover');
  const folderRow = () => library.locator('.library-folders .library-row').first();
  await folderRow().click({ button: 'right' });
  await expect(page.getByRole('menu').first()).toBeVisible();
  await hoverColours(page.getByRole('menu').first(), failures, 'folder menu highlight', async () => {
    library = await openLibrary(page);
    await folderRow().click({ button: 'right' });
  });
  await page.keyboard.press('Escape');
  await closeLibrary(page);
  if (await page.locator('.app-sidebar').isVisible()) {
    await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
    failures.push(...await selectedRow(page.locator('.app-sidebar'), 'collapsed'));
    await hoverColours(page.locator('.app-sidebar'), failures, 'collapsed hover');
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  }
  // The side panel and the Settings sheet are surfaces too.
  await closeMenus(page);
  await openPanel(page);
  await hoverColours(page.locator(sidePanel), failures, 'panel hover');
  await page.keyboard.press('Control+,');
  await expect(page.locator('.settings-sheet')).toBeVisible();
  await hoverColours(page.locator('.settings-sheet'), failures, 'settings hover');
  report('A', failures);
});

test('B disabled controls stay inert on hover', async ({ page }, info) => {
  const failures: Violation[] = [];
  const disabled = page.locator(`${interactive.split(', ').map(s => `${s}:disabled`).join(', ')}, [aria-disabled="true"]`);
  // Back and Forward live in the desktop sidebar; a phone uses the browser's own.
  if (!info.project.name.endsWith('390')) expect(await disabled.count()).toBeGreaterThan(0);
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
      // A visually hidden input is not the hit target; its label wraps it.
      if (await control.evaluate(el => el instanceof HTMLInputElement && getComputedStyle(el).opacity === '0')) continue;
      const titleBar = await control.evaluate(el => !!el.closest('.canvas-header, .app-sidebar'));
      // Every library control, labelled or not, is a full 32px target.
      const library = await control.evaluate(el => !!el.closest('.folder-rail, .folder-sheet'));
      const iconOnly = !(await control.innerText()).trim();
      if (!titleBar && !library && !iconOnly) continue;
      if (!titleBar && !library && await control.evaluate((el, allowlist) => Object.keys(allowlist).some(selector => el.matches(selector)), smallTargetAllowlist)) continue;
      const box = await control.boundingBox();
      const minimum = titleBar || library ? 32 : 24;
      if (box && (box.width < minimum || box.height < minimum)) failures.push({ id: await name(control), expected: `>= ${minimum}×${minimum}`, actual: `${box.width}×${box.height}` });
    }
  }
  await scan(page.locator('.notes-window'));
  // The Pinned fold uses a 32×32 target even with text; the time rail is a full-height strip.
  const wallTargets = await page.locator('.section-toggle').all();
  if (!await page.locator('.time-rail .trail').count() || !await page.locator('.section-toggle').count()) failures.push({ id: 'wall navigation', expected: 'time rail and Pinned fold for the seed', actual: 'missing' });
  for (const control of wallTargets) {
    const box = await control.boundingBox();
    if (box && (box.width < 32 || box.height < 32)) failures.push({ id: `wall: ${await name(control)}`, expected: '>= 32×32', actual: `${box.width}×${box.height}` });
  }
  const library = await openLibrary(page);
  await scan(library);
  await library.getByRole('button', { name: 'New folder', exact: true }).click();
  await scan(library);
  await page.keyboard.press('Escape');
  await closeLibrary(page);
  if (await page.locator('.app-sidebar').isVisible()) {
    await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
    await scan(page.locator('.app-sidebar'));
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  }
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeVisible();
  await scan(page.locator('.note-switcher'));
  await page.keyboard.press('Escape');
  await openMore(page);
  await scan(page.getByRole('menu').first());
  await page.keyboard.press('Escape');
  await openContext(page);
  await scan(page.getByRole('menu').first());
  await showAccount(page);
  await scan(page.locator('.canvas-header, .app-sidebar'));
  // The side panel and the Settings sheet are surfaces too.
  await openPanel(page);
  await scan(page.locator(sidePanel));
  await page.keyboard.press('Control+,');
  await expect(page.locator('.settings-sheet')).toBeVisible();
  await scan(page.locator('.settings-sheet'));
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

// Long folder names shorten in the middle: what is painted fits, keeps both
// ends, and near-duplicates stay distinct.
async function fittedNames(scope: Locator, state: string): Promise<Violation[]> {
  return scope.locator('.row-name, .fitted-name').evaluateAll((spans, { state, nearDuplicates }) => {
    const failures: Violation[] = [];
    const painted = new Map<string, string>();
    for (const span of spans) {
      const full = span.closest('[title]')?.getAttribute('title') || '';
      const text = span.textContent || '';
      painted.set(full, text);
      if (span.scrollWidth > span.clientWidth + 1) failures.push({ id: `${state}: ${full}`, expected: `scrollWidth <= ${span.clientWidth}`, actual: `${span.scrollWidth}` });
      if (text !== full && (!text.includes(' … ') || !full.startsWith(text.split(' … ')[0]) || !full.endsWith(text.split(' … ')[1]))) failures.push({ id: `${state}: ${full}`, expected: 'start … end of the full name', actual: text });
    }
    const [a, b] = nearDuplicates.map(name => painted.get(name));
    if (a !== undefined && b !== undefined && a === b) failures.push({ id: `${state}: near-duplicates`, expected: 'distinct', actual: a });
    return failures;
  }, { state, nearDuplicates });
}

test('D extreme text fits wall, switcher and menus', async ({ page }) => {
  const failures: Violation[] = [];
  const pageWidth = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, expected: innerWidth }));
  if (pageWidth.actual > pageWidth.expected) failures.push({ id: 'page horizontal scroll', actual: `${pageWidth.actual}`, expected: `${pageWidth.expected}` });
  failures.push(...await overflow(page, '.note-wall', 'wall'));
  // Sections, cards and the time rail never intersect; card content stays inside its card;
  // within each section cards run row by row, left to right.
  const overlap = await page.evaluate(() => {
    const failures: Violation[] = [];
    const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const cards = Array.from(document.querySelectorAll('.note-card'));
    const headings = Array.from(document.querySelectorAll('.section-heading'));
    const rail = document.querySelector('.time-rail .trail');
    if (headings.length < 3 || !rail) failures.push({ id: 'wall sections', expected: 'at least 3 section headings and a time rail', actual: `${headings.length} headings, rail ${!!rail}` });
    const blocks = [...cards.map((el, i) => [`card ${i}`, el] as const), ...headings.map(el => [`heading ${el.textContent}`, el] as const), ...(rail ? [['rail', rail] as const] : [])];
    for (const [i, [a, first]] of blocks.entries()) for (const [b, second] of blocks.slice(i + 1)) {
      if (hit(first.getBoundingClientRect(), second.getBoundingClientRect())) failures.push({ id: `${a} overlaps ${b}`, expected: 'no intersection', actual: `${first.textContent?.slice(0, 40)} / ${second.textContent?.slice(0, 40)}` });
    }
    for (const [i, card] of cards.entries()) for (const content of card.querySelectorAll('strong, p, .note-miniature, footer')) {
      const a = content.getBoundingClientRect();
      for (const [j, other] of cards.entries()) {
        if (i !== j && hit(a, other.getBoundingClientRect())) failures.push({ id: `card ${i} content overlaps card ${j}`, expected: 'no intersection', actual: content.textContent || '' });
      }
    }
    for (const grid of document.querySelectorAll('.note-grid')) {
      const boxes = Array.from(grid.querySelectorAll('.note-card'), card => card.getBoundingClientRect());
      for (const [i, b] of boxes.entries()) {
        const a = boxes[i - 1];
        if (!a) continue;
        const ordered = Math.abs(a.top - b.top) < 1 ? b.left > a.left : b.top >= a.bottom - 1 && b.left <= a.left + 1;
        if (!ordered) failures.push({ id: `${grid.getAttribute('aria-label')}: card ${i} out of reading order`, expected: 'right of the previous card, or first in a lower row', actual: `(${a.left},${a.top}) -> (${b.left},${b.top})` });
      }
    }
    return failures;
  });
  failures.push(...overlap);
  const library = await openLibrary(page);
  failures.push(...await overflow(page, '.folder-rail, .folder-sheet', 'library'));
  failures.push(...await fittedNames(library, 'library'));
  const filter = library.getByRole('searchbox', { name: 'Filter folders' });
  await filter.fill('reference');
  await expect(library.getByText('2 of 30 folders')).toBeVisible();
  failures.push(...await fittedNames(library, 'library filtered'));
  await filter.press('Escape');
  await expect(filter).toHaveValue('');
  await library.getByRole('button', { name: 'New folder', exact: true }).click();
  await library.getByRole('textbox', { name: 'New folder name' }).fill('W'.repeat(60));
  failures.push(...await overflow(page, '.folder-rail, .folder-sheet', 'library naming'));
  await page.keyboard.press('Escape');
  await closeLibrary(page);
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('reference');
  await expect(page.getByRole('option').filter({ hasText: nearDuplicates[0] })).toBeVisible();
  failures.push(...await fittedNames(page.locator('.note-switcher'), 'switcher folders'));
  failures.push(...await overflow(page, '.note-switcher', 'switcher folders'));
  await page.keyboard.press('Escape');
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
  await closeMenus(page);
  // The side panel and the Settings sheet are surfaces too.
  await openPanel(page);
  failures.push(...await overflow(page, sidePanel, 'panel'));
  await page.keyboard.press('Control+,');
  await expect(page.locator('.settings-sheet')).toBeVisible();
  failures.push(...await overflow(page, '.settings-sheet', 'settings'));
  report('D', failures);
});

test('E title bar concepts are not duplicated in More', async ({ page }) => {
  const failures: Violation[] = [];
  const barNames = await Promise.all((await page.locator('.canvas-header, .app-sidebar').locator(interactive).all()).map(name));
  await openMore(page);
  const menuNames = await Promise.all((await page.locator('[role^="menuitem"]').all()).map(name));
  for (const [concept, aliases] of Object.entries(concepts)) {
    const matches = (label: string) => aliases.some(alias => new RegExp(`\\b${alias}\\b`, 'i').test(label));
    if (barNames.some(matches) && menuNames.some(matches)) failures.push({ id: concept, expected: 'one location', actual: `${barNames.filter(matches)} / ${menuNames.filter(matches)}` });
  }
  await page.keyboard.press('Escape');
  // One home for each library control: rail or sheet, never both, and no
  // control repeated between the library and the wall header.
  const railShown = await page.locator('.folder-rail').isVisible();
  const opener = await page.getByRole('button', { name: 'Open folders', exact: true }).isVisible();
  if (railShown === opener) failures.push({ id: 'library entry', expected: 'rail or Open folders, not both', actual: `rail=${railShown} opener=${opener}` });
  const library = await openLibrary(page);
  const visibleNames = async (root: Locator) => {
    const names: string[] = [];
    for (const control of await root.locator(interactive).all()) if (await control.isVisible()) names.push(await name(control));
    return names;
  };
  const libraryNames = await visibleNames(library);
  const headerNames = await visibleNames(page.locator('.canvas-header'));
  for (const label of new Set([...libraryNames, ...headerNames])) {
    const count = [...libraryNames, ...headerNames].filter(n => n === label).length;
    if (count > 1) failures.push({ id: `library: ${label}`, expected: 'one control', actual: `${count}` });
  }
  await closeLibrary(page);
  report('E', failures);
});

for (const signedIn of [false, true]) test(`F title bar clicks have no immediate consequences (${signedIn ? 'account' : 'guest'})`, async ({ page }) => {
  // Network fixture exercises the real account UI without credentials, a database,
  // or a production test hook. Notes remain in the signed-out local adapter.
  if (signedIn) await showAccount(page);
  const failures: Violation[] = [];
  const signouts: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/auth/signout')) signouts.push(request.url()); });
  // Chrome only: New note in the sidebar's search row is an explicit create action, not a bar click.
  const controls = page.locator('.canvas-header, .side-top, .side-foot').locator(interactive);
  const candidates: { index: number; label: string }[] = [];
  for (const [index, control] of (await controls.all()).entries()) if (await control.isVisible() && (!(await control.innerText()).trim() || await control.evaluate(el => el.matches('.account-trigger'))) && await control.isEnabled()) candidates.push({ index, label: await name(control) });
  candidates.push({ index: -1, label: 'Share note' });
  const noteCount = () => page.evaluate(() => { const notes: unknown = JSON.parse(localStorage.getItem('webnotes_notes_v1') || '[]'); return Array.isArray(notes) ? notes.length : -1; });
  for (const { index, label } of candidates) {
    await page.keyboard.press('Escape');
    if (label === 'Home' || label === 'Share note') {
      await page.locator('.note-card').first().click();
      await expect(page.locator('main')).toHaveClass(/writing/);
    }
    const before = await noteCount();
    const url = page.url();
    const domBefore = await page.locator('main').innerHTML();
    const theme = await page.locator('html').getAttribute('class');
    await (index === -1 ? page.getByRole('button', { name: 'Share note', exact: true }) : controls.nth(index)).click();
    if (page.url() !== url) { if (!navigationAllowlist[label]) failures.push({ id: label, expected: 'no navigation', actual: page.url() }); await page.goto(url); continue; }
    await expect.poll(async () => page.url() !== url || (await page.locator('main').innerHTML({ timeout: 1000 })) !== domBefore || (await page.locator('html').getAttribute('class')) !== theme || await page.locator('[role="menu"], [role="dialog"]').count() > 0).toBe(true);
    if (signouts.length || page.url() !== url || await noteCount() !== before) failures.push({ id: label, expected: 'no signout, navigation, or note mutation', actual: `signouts=${signouts.length}; url=${page.url()}; notes changed=${await noteCount() !== before}` });
    const strip = page.getByRole('button', { name: 'Expand sidebar', exact: true });
    if (await strip.isVisible()) await strip.click();
    if (label === 'Share note') { await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Home', exact: true }).click(); }
  }
  report(signedIn ? 'F account' : 'F guest', failures);
});

// Check G compares a selected option with its unselected siblings. The selected
// item must differ by a perceptible contrast margin on its surface (background,
// including a sliding indicator painted under it) or its edge (border or
// box-shadow). Text and icon colour are reported but never suffice: the pane
// switcher shipped with ink-vs-muted icons on a flat chip and still read as
// unselected (WCAG 1.4.1). String inequality is not enough either.
// `groups` must each be compared; a group with no visible selection is a failure, not a skip.
async function selectionFailures(page: Page, root: string, state: string, groups: string[]): Promise<Violation[]> {
  // Park the mouse: a link left hovered would mask the selected item's channels.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(350);
  return page.locator(root).evaluate((element, { state, groups }) => {
    // The quietest designed selection, the light Settings rail, measures 1.07x.
    const BG = 1.05, EDGE = 1.25;
    const parse = (value: string): number[] | null => {
      const rgb = /rgba?\(([^)]+)\)/.exec(value);
      if (rgb) {
        const [rgbPart, alphaPart] = rgb[1].split('/');
        const n = rgbPart.trim().split(/[\s,]+/).map(Number);
        if (n.length < 3 || n.slice(0, 3).some(c => Number.isNaN(c))) return null;
        const alpha = alphaPart !== undefined ? parseFloat(alphaPart) : n.length > 3 ? n[3] : 1;
        return [n[0], n[1], n[2], Math.max(0, Math.min(1, alpha))];
      }
      const srgb = /color\(\s*srgb\s+([^)]+)\)/.exec(value);
      if (srgb) {
        const [rgbPart, alphaPart] = srgb[1].split('/');
        const n = rgbPart.trim().split(/\s+/).map(Number);
        if (n.length < 3 || n.slice(0, 3).some(c => Number.isNaN(c))) return null;
        const alpha = alphaPart !== undefined ? parseFloat(alphaPart) : 1;
        return [n[0] * 255, n[1] * 255, n[2] * 255, Math.max(0, Math.min(1, alpha))];
      }
      return null;
    };
    // Composite a (possibly translucent) layer onto the colour behind it.
    const over = (fg: number[], bg: number[]): number[] =>
      fg[3] >= 1 ? [fg[0], fg[1], fg[2], 1]
        : [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    const channel = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = (rgb: number[]) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
    const contrast = (a: number[], b: number[]) => {
      const la = lum(a), lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    // Composite translucent rail and panel layers onto their actual backdrop.
    const track = (from: Element): number[] => {
      const layers: number[][] = [];
      for (let node: Element | null = from; node; node = node.parentElement) {
        const colour = parse(getComputedStyle(node).backgroundColor);
        if (!colour) continue;
        layers.push(colour);
        if (colour[3] >= 0.999) break;
      }
      return layers.reverse().reduce((background, colour) => over(colour, background), [255, 255, 255, 1]);
    };
    const edges = (el: Element): (number[] | null)[] => {
      const style = getComputedStyle(el);
      const out: (number[] | null)[] = [];
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        if (parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== 'none') {
          const c = parse(style[`border${side}Color`]);
          out.push(c);
        } else out.push(null);
      }
      for (const m of style.boxShadow.matchAll(/rgba?\([^)]+\)|color\(\s*srgb[^)]+\)|#[0-9a-fA-F]{3,8}/g)) {
        const c = parse(m[0]);
        if (c) out.push(c);
      }
      return out;
    };
    const textColours = (el: Element): number[][] =>
      [getComputedStyle(el).color, ...Array.from(el.querySelectorAll('svg')).map(svg => getComputedStyle(svg).color)]
        .map(value => parse(value)).filter((c): c is number[] => !!c);
    const label = (el: Element) =>
      el.getAttribute('aria-label')
      || (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      || el.tagName.toLowerCase();

    const failures: Violation[] = [];
    const compared: Element[] = [];
    for (const group of [element, ...Array.from(element.querySelectorAll('[role="tablist"], nav, fieldset, .switcher-chips'))]) {
      let items: Element[] = [];
      let isSelected = (el: Element) => false;
      if (group.matches('.folder-rail, .folder-sheet')) {
        items = Array.from(group.querySelectorAll('button.library-row'));
        isSelected = el => el.getAttribute('aria-current') === 'true';
      } else if (group.matches('[role="tablist"]')) {
        items = Array.from(group.querySelectorAll('[role="tab"]'));
        isSelected = el => el.getAttribute('aria-selected') === 'true';
      } else if (group.matches('.switcher-chips')) {
        items = Array.from(group.querySelectorAll('button[aria-pressed]'));
        isSelected = el => el.getAttribute('aria-pressed') === 'true';
      } else if (group.matches('fieldset')) {
        // Radio and checkbox inputs are hidden; the label around them is styled.
        items = Array.from(group.querySelectorAll('input')).map(input => input.closest('label') ?? input);
        isSelected = el => {
          const input = el instanceof HTMLInputElement ? el : el.querySelector('input');
          return input instanceof HTMLInputElement && input.checked;
        };
      } else {
        items = Array.from(group.querySelectorAll('a[href]'));
        isSelected = el => el.getAttribute('aria-current') === 'page';
      }
      items = items.filter(el => el.getClientRects().length);
      const selected = items.filter(isSelected);
      const rest = items.filter(el => !isSelected(el));
      if (selected.length !== 1 || rest.length === 0) continue;
      compared.push(group);
      const item = selected[0];
      const indicators = Array.from(group.querySelectorAll('.sliding-indicator'))
        .filter(indicator => indicator.getClientRects().length);
      // The indicator is z-index -1 under exactly one item: whichever contains it.
      const under = (el: Element) => indicators.find(indicator => {
        const a = indicator.getBoundingClientRect(), b = el.getBoundingClientRect();
        return a.left <= b.left + b.width / 2 && b.left + b.width / 2 <= a.right
          && a.top <= b.top + b.height / 2 && b.top + b.height / 2 <= a.bottom;
      });
      const effectiveBg = (el: Element) => {
        let bg = track(group);
        const indicator = under(el);
        if (indicator) {
          const c = parse(getComputedStyle(indicator).backgroundColor);
          if (c) bg = over(c, bg);
        }
        const own = parse(getComputedStyle(el).backgroundColor);
        if (own) bg = over(own, bg);
        return bg;
      };
      for (const sibling of rest) {
        const bgDelta = contrast(effectiveBg(item), effectiveBg(sibling));
        let colourDelta = 1;
        for (const a of textColours(item)) for (const b of textColours(sibling)) colourDelta = Math.max(colourDelta, contrast(a, b));
        const itemEdges = edges(item), siblingEdges = edges(sibling);
        // Match border sides and shadow layers; crossing unrelated edges lets
        // identical controls with light and dark borders pass as different.
        let edgeDelta = 1;
        for (let i = 0; i < Math.max(itemEdges.length, siblingEdges.length); i++) {
          const a = itemEdges[i], b = siblingEdges[i];
          edgeDelta = Math.max(edgeDelta, contrast(
            a ? over(a, effectiveBg(item)) : effectiveBg(item),
            b ? over(b, effectiveBg(sibling)) : effectiveBg(sibling),
          ));
        }
        if (bgDelta < BG && edgeDelta < EDGE) {
          failures.push({
            id: `${state}: ${label(item)} selection invisible`,
            expected: `a surface or edge differs from its sibling by contrast: background >= ${BG} or edge >= ${EDGE}`,
            actual: `background ${bgDelta.toFixed(2)}x, colour ${colourDelta.toFixed(2)}x, edge ${edgeDelta.toFixed(2)}x (sibling: ${label(sibling)})`,
          });
        }
      }
    }
    for (const selector of groups) if (!compared.some(group => group.matches(selector)))
      failures.push({ id: `${state}: ${selector} not compared`, expected: 'one selected item and at least one unselected sibling', actual: 'missing' });
    return failures;
  }, { state, groups });
}

test('G selected options differ visibly from their siblings', async ({ page }) => {
  const failures: Violation[] = [];
  // Scopes and folders are one selection group, including on the phone sheet.
  for (const scope of ['all', 'pinned', 'folder']) {
    let library = await openLibrary(page);
    await (scope === 'folder' ? library.locator('.library-folders .library-row').first()
      : library.locator(`[data-scope="${scope}"]`)).click();
    library = await openLibrary(page);
    const selector = await page.locator('.folder-rail').isVisible() ? '.folder-rail' : '.folder-sheet';
    failures.push(...await selectionFailures(page, selector, `library ${scope}`, [selector]));
    await closeLibrary(page);
  }
  const library = await openLibrary(page);
  await library.locator('[data-scope="all"]').click();
  await closeLibrary(page);
  // The switcher filter chips.
  await page.keyboard.press('Control+k');
  await expect(page.locator('.note-switcher')).toBeVisible();
  failures.push(...await selectionFailures(page, '.note-switcher', 'switcher', ['.switcher-chips']));
  await page.keyboard.press('Escape');
  // The side panel pane switcher, opened like a writer would: card, then menu.
  await openPanel(page);
  failures.push(...await selectionFailures(page, sidePanel, 'panel', ['.pane-tabs']));
  // The Settings sheet: section rail on arrival, theme choices on Appearance.
  await page.keyboard.press('Control+,');
  await expect(page.locator('.settings-sheet')).toBeVisible();
  failures.push(...await selectionFailures(page, '.settings-sheet', 'settings rail', ['.settings-rail nav']));
  await page.locator('.settings-rail nav a', { hasText: 'Appearance' }).click();
  await expect(page.locator('.settings-themes')).toBeVisible();
  failures.push(...await selectionFailures(page, '.settings-content', 'settings themes', ['fieldset.settings-themes']));
  report('G', failures);
});

// An icon-only control is a centred square, and a selected one is marked once:
// a fill, never a fill plus a bar beside it.
async function iconGeometry(page: Page, state: string): Promise<Violation[]> {
  return page.evaluate(state => {
    const failures: Violation[] = [];
    const painted = (colour: string) => { const n = colour.match(/[\d.]+/g); return !!n && (n.length < 4 || Number(n[3]) > 0.02); };
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect(), style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    // Segmented tabs share one sliding pill, so each tab is wider than tall by design.
    for (const el of document.querySelectorAll('button:not([role="tab"]), [role="button"]')) {
      if (!shown(el)) continue;
      const name = el.getAttribute('aria-label') || el.getAttribute('title') || el.className.toString();
      const style = getComputedStyle(el), box = el.getBoundingClientRect();
      const bar = ['::before', '::after'].map(pseudo => getComputedStyle(el, pseudo))
        .find(p => p.content !== 'none' && p.content !== 'normal' && painted(p.backgroundColor) && (parseFloat(p.width) <= 4 || parseFloat(p.height) <= 4));
      const selected = el.matches('[aria-current], [aria-pressed="true"], [data-active]');
      if (selected && painted(style.backgroundColor) && bar) failures.push({ id: `${state}: ${name} marked twice`, expected: 'a fill or a bar, not both', actual: 'fill and bar' });
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let labelled = false;
      while (walker.nextNode()) {
        const parent = walker.currentNode.parentElement;
        if (walker.currentNode.textContent?.trim() && parent && !parent.closest('svg, kbd, .sr-only, .strip-initial') && parent.getBoundingClientRect().width > 1) labelled = true;
      }
      const icons = Array.from(el.querySelectorAll('svg')).filter(shown);
      if (labelled || icons.length !== 1) continue;
      const icon = icons[0].getBoundingClientRect();
      const dx = icon.left + icon.width / 2 - (box.left + box.width / 2), dy = icon.top + icon.height / 2 - (box.top + box.height / 2);
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) failures.push({ id: `${state}: ${name} icon off-centre`, expected: 'within 1px of the centre', actual: `${dx.toFixed(1)}, ${dy.toFixed(1)}` });
      if (Math.abs(box.width - box.height) > 1 && (painted(style.backgroundColor) || selected))
        failures.push({ id: `${state}: ${name} not square`, expected: 'equal width and height', actual: `${box.width}×${box.height}` });
    }
    return failures;
  }, state);
}

test('H icon-only controls are centred squares, selected once', async ({ page }, info) => {
  const failures: Violation[] = [];
  failures.push(...await iconGeometry(page, 'home'));
  if (!info.project.name.endsWith('390')) {
    for (const scope of ['all', 'pinned', 'folder']) {
      await (scope === 'folder' ? page.locator('.library-folders .library-row').first() : page.locator(`.folder-rail [data-scope="${scope}"]`)).click();
      await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
      await expect(page.locator('.app-sidebar .strip')).toBeVisible();
      failures.push(...await iconGeometry(page, `strip ${scope}`));
      await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
    }
  }
  await openPanel(page);
  failures.push(...await iconGeometry(page, 'note with panel'));
  report('H', failures);
});

test('G rejects identical controls with multiple painted edges', async ({ page }) => {
  await page.setContent(`<main><div role="tablist">
    <button role="tab" aria-selected="true">Selected</button>
    <button role="tab" aria-selected="false">Other</button>
  </div></main><style>
    main { background: white; }
    button { background: white; border: 2px solid black; border-top-color: white;
      box-shadow: 0 1px 0 rgba(0,0,0,.5), 0 2px 0 white; }
  </style>`);
  const failures = await selectionFailures(page, 'main', 'identical edges', ['[role="tablist"]']);
  expect(failures).toHaveLength(1);
  expect(failures[0].id).toBe('identical edges: Selected selection invisible');
  expect(failures[0].actual).toContain('edge 1.00x');
});
