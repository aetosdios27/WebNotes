// Exact IDs only. Unknown violations and unexpectedly fixed IDs both fail.
// The switcher overflow entries were fixed by #30.
export const knownIssues: { project: string; check: string; id: string; pr: string }[] =
  // At phone width ⌘, opens the Settings drill-in list, which deliberately shows
  // no current row, yet SettingsSheet still marks Account aria-current="page"
  // (section falls back to Account when the URL names none). Fix: omit
  // aria-current while the phone list is showing.
  ['light-390', 'dark-390'].map(project => ({
    project, check: 'G', id: 'settings rail: Account selection invisible',
    pr: 'unfixed: phone Settings list marks Account aria-current with no visible selection',
  }));
