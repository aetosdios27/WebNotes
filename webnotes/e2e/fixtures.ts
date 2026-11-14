import { test as base, expect } from '@playwright/test';
import type { Note, Folder } from '../src/lib/storage/types';
import { knownIssues } from './known-issues';

import { longTitle } from './seed';
export { longTitle };
export const longFolder = 'F'.repeat(78);
// Near-duplicates differ only at the end: an end ellipsis would make them identical.
export const nearDuplicates = [
  'University applications — reference letters, drafts before',
  'University applications — reference letters, drafts after',
];
export const sixtyCharacterFolder = 'Home renovation — materials, quotes and contractor notes, 26';
const named = [longFolder, 'G'.repeat(60), ...nearDuplicates, sixtyCharacterFolder];
const createdAt = new Date('2026-01-01T00:00:00Z');
const folders: Folder[] = Array.from({ length: 30 }, (_, i) => ({ id: `folder-${i}`, name: named[i] ?? `Folder ${i}`, createdAt }));
const now = Date.now();
const notes: Note[] = Array.from({ length: 55 }, (_, i) => ({
  id: `note-${i}`, title: i === 0 ? longTitle : i === 1 ? '' : `Seed note ${i}`,
  content: i === 0 ? `<p>https://example.com/${'unbroken'.repeat(30)}</p>` : i === 1 ? '' : `<p>Body ${i} ${'words worth keeping '.repeat(i % 5 * 4)}</p>`,
  folderId: i === 0 ? 'folder-0' : i % 2 === 0 ? `folder-${i % 29 + 1}` : null, createdAt,
  updatedAt: new Date(now - i * 9 * 864e5 - i * 1000), isPinned: i < 48 && i % 4 === 0,
  pinnedAt: i < 48 && i % 4 === 0 ? new Date(now - i * 1000) : null,
}));
export const test = base.extend({
  page: async ({ page }, use, info) => {
    await page.addInitScript(({ notes, folders }) => {
      if (!localStorage.getItem('webnotes_notes_v1')) {
        localStorage.setItem('webnotes_notes_v1', JSON.stringify(notes));
        localStorage.setItem('webnotes_folders_v1', JSON.stringify(folders));
      }
    }, { notes, folders });
    await page.goto('/');
    await page.evaluate(theme => localStorage.setItem('theme', theme), info.project.name.split('-')[0]);
    await page.reload();
    await expect(page.locator('.note-card').first()).toBeVisible();
    await expect(page.locator('html')).toHaveClass(new RegExp(info.project.name.split('-')[0]));
    // Optional mutation probes affect only this isolated browser document.
    if (process.env.UI_MUTATION === 'icon') await page.addStyleTag({ content: 'button:hover svg.lucide { color: var(--ink) !important; }' });
    const mutations: Record<string, string> = {
      disabled: 'button:disabled:hover { color: red !important; background: red !important; }',
      targets: '.window-bar .history-button { min-width: 8px !important; width: 8px !important; height: 8px !important; padding: 0 !important; }',
      resolved: '.settings-rail nav a[aria-current="page"] { background: var(--ink) !important; }',
      overflow: 'html { min-width: 2000px !important; }',
      // G: the active pane chip matches its track; its ink icon alone must not pass.
      selection: '.pane-tabs .sliding-indicator { background: var(--selected) !important; box-shadow: none !important; }',
      // G: the current Settings rail item loses its raised surface; ink and weight alone must not pass.
      rail: '.settings-rail nav a[aria-current="page"] { background: transparent !important; box-shadow: none !important; }',
      order: '.note-cell:nth-child(2) { order: -1; }',
      'wall-targets': '.month-scrubber .scrub-now { min-height: 20px !important; height: 20px !important; }',
      selected: '.library-row[data-active] { background: transparent !important; box-shadow: none !important; font-weight: inherit !important; }',
    };
    const css = mutations[process.env.UI_MUTATION || ''];
    if (css) await page.addStyleTag({ content: css });
    if (process.env.UI_MUTATION === 'consequences') await page.locator('.theme-toggle').evaluate(el => el.addEventListener('click', () => { void fetch('/api/auth/signout', { method: 'POST' }); }));
    await use(page);
  },
});
export { expect };
export type Violation = { id: string; actual: string; expected: string };
export function report(check: string, failures: Violation[]) {
  const info = test.info();
  void info.attach('violations', { body: JSON.stringify(failures, null, 2), contentType: 'application/json' });
  const known = knownIssues.filter(issue => issue.project === info.project.name && issue.check === check);
  const unknown = failures.filter(failure => !known.some(issue => issue.id === failure.id));
  const missing = known.filter(issue => !failures.some(failure => failure.id === issue.id));
  expect(unknown, `${info.project.name} ${check}: new UI violations`).toEqual([]);
  expect(missing, `${info.project.name} ${check}: fixed issues; remove these entries`).toEqual([]);
  if (known.length) test.fail(true, known.map(issue => `${issue.id}: ${issue.pr}`).join('\n'));
  expect(failures, `${info.project.name} ${check}: expected vs actual`).toEqual([]);
}
