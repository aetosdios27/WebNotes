import { longTitle } from './seed';
// Exact IDs only. Unknown violations and unexpectedly fixed IDs both fail.
// Switcher overflow is fixed by #30; remove these entries when it merges.
export const knownIssues: { project: string; check: string; id: string; pr: string }[] =
  ['light', 'dark'].flatMap(theme => [1280, 390].flatMap(width => {
    const project = `${theme}-${width}`;
    return [
      ...['switcher: STRONG.', ...(width === 1280 ? ['switcher: H2.'] : [])].map(prefix => ({
        project, check: 'D', id: `${prefix}: ${longTitle}`,
        pr: 'https://github.com/aetosdios27/WebNotes/pull/30 (switcher text constraints)',
      })),
    ];
  }));
