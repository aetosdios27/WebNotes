// Exact IDs only. Unknown violations and unexpectedly fixed IDs both fail.
// The switcher overflow entries were fixed by #30; nothing is known-broken now.
export const knownIssues: { project: string; check: string; id: string; pr: string }[] = [];
