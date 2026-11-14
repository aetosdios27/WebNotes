import { longTitle } from './seed';
// Exact IDs only. Unknown violations and unexpectedly fixed IDs both fail.
// #26 is merged but left Home undersized. #29 fixes the wall title; switcher
// entries track the remaining text-constraints follow-up described in that PR.
export const knownIssues: { project: string; check: string; id: string; pr: string }[] =
  ['light', 'dark'].flatMap(theme => [1280, 390].flatMap(width => {
    const project = `${theme}-${width}`;
    return [
      ...(width === 390 ? [{ project, check: 'F guest', id: 'Sign in', pr: 'https://github.com/aetosdios27/WebNotes/pull/28 (mobile sign-in remains an immediate navigation)' }] : []),
      { project, check: 'C', id: 'Home', pr: 'https://github.com/aetosdios27/WebNotes/pull/26 (remaining Home target)' },
      ...['wall: STRONG.', 'switcher: STRONG.', ...(width === 1280 ? ['switcher: H2.'] : [])].map(prefix => ({
        project, check: 'D', id: `${prefix}: ${longTitle}`,
        pr: 'https://github.com/aetosdios27/WebNotes/pull/29 (wall fix and remaining text-constraints follow-up)',
      })),
    ];
  }));
