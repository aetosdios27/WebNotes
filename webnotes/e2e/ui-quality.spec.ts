import type { Locator, Page } from '@playwright/test';
import { test, expect, report, longTitle, type Violation } from './fixtures';
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

// The note side panel, opened like a writer would: a card, then ⋯ → Note information.
const sidePanel = 'div:has(> div > [role="tablist"][aria-label="Note panel"])';
async function openPanel(page: Page) {
  await page.locator('.note-card').first().click();
  await expect(page.locator('main')).toHaveClass(/writing/);
  await openMore(page);
  await page.getByRole('menuitem', { name: 'Note information & history' }).click();
  await expect(page.locator(sidePanel).locator('.pane-tabs [role="tab"]')).toHaveCount(3);
}

async function showAccount(page: Page) {
  // No cloud user ID: exercise the actual account UI with local notes.
  await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { name: 'UI Tester', email: 'ui@example.test' }, expires: '2099-01-01T00:00:00Z' } }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account:', exact: false })).toBeVisible();
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
  // The side panel and the Settings sheet are surfaces too.
  await closeMenus(page);
  await openPanel(page);
  await hoverColours(page.locator(sidePanel), failures, 'panel hover');
  await page.keyboard.press('Control+,');
  await expect(page.locator('.settings-sheet')).toBeVisible();
  await hoverColours(page.locator('.settings-sheet'), failures, 'settings hover');
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
      // A visually hidden input is not the hit target; its label wraps it.
      if (await control.evaluate(el => el instanceof HTMLInputElement && getComputedStyle(el).opacity === '0')) continue;
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
  await showAccount(page);
  await scan(page.locator('.window-right'));
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
  if (signedIn) await showAccount(page);
  const failures: Violation[] = [];
  const signouts: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/auth/signout')) signouts.push(request.url()); });
  const controls = page.locator('.window-bar').locator(interactive);
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
    // The surface behind a group: the nearest opaque ancestor background.
    const track = (from: Element): number[] => {
      for (let node: Element | null = from; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c[3] >= 0.999) return [c[0], c[1], c[2], 1];
      }
      return [255, 255, 255, 1];
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
    for (const group of Array.from(element.querySelectorAll('[role="tablist"], nav, fieldset, .switcher-chips'))) {
      let items: Element[] = [];
      let isSelected = (el: Element) => false;
      if (group.matches('[role="tablist"]')) {
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
  // The wall tabs.
  failures.push(...await selectionFailures(page, '.note-wall', 'wall', ['.wall-tabs [role="tablist"]']));
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
