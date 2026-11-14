# UI quality gate

From `webnotes/`, install with `bun install --frozen-lockfile`, then
`bunx playwright install --with-deps chromium` once. Run `bun run test:ui`.
The runner builds the app and launches `next start` on port 3100. It reuses an
existing server locally; stop it when finished:
`lsof -ti tcp:3100 -sTCP:LISTEN | xargs -r kill`.

All checks run on Chromium in light/dark at 1280×800 and 390×844. Each isolated
browser context seeds the real `webnotes_notes_v1` / `webnotes_folders_v1` local
adapter format: 55 notes, an 80-letter title, an unbroken URL, 30 folders including
60- and 78-letter names. Theme is set in localStorage followed by a reload.
No production hook or application change is needed. The account test intercepts
only the NextAuth session response (without a cloud user ID) to exercise the
actual avatar menu while keeping notes local.

- A: real hover, Tab focus-visible, More and card menu highlight compare computed
  icon colour with the associated label (bugs 1 and 2).
- B: disabled foreground, descendant foreground and background are unchanged by
  hover (bug 3).
- C: title-bar controls must be 32×32; other icon-only controls 24×24 (bug 7).
- D: page width, visible-overflow text and card content intersections with other
  cards, including switcher search and folder submenu (bug 6).
- E: concepts reachable from both title bar and More fail (bug 4).
- F: guest/account icon clicks must preserve notes and URL and send no signout
  request; controls must react. Home on the home wall is idempotent (bug 5).

`registry.ts` is the single place to extend duplicate concepts and add narrowly
justified small-target exceptions. Title-bar controls cannot be exempted.

`known-issues.ts` contains exact violation IDs, projects, checks and related fix
PRs. `report()` first rejects unknown IDs and missing known IDs, then marks the
remaining exact failures with Playwright `test.fail`. Thus new bugs cannot hide
behind an expected failure; fixes cause failure until their entry is removed.
Infrastructure/timeouts never count as expected failures. Assertion output and
JSON attachments include the control, theme, viewport, expected and actual.

Mutation probes are browser-only, opt-in and never affect production code:
`UI_MUTATION=icon bun run test:ui --project=dark-1280 --grep 'A icon'`.
Other values/checks are `disabled`/B, `targets`/C, `overflow`/D,
`duplicates`/E, `consequences`/F. Each must exit nonzero with a **new violation**,
not merely an expected baseline failure. In particular `icon` restores the
original global `--ink` hover rule, including the yellow New note button.

CI builds once for all projects; no existing PR workflow builds Next. It uses
two workers, cancels superseded runs, caches browsers and uploads the HTML report,
screenshots and traces on failure. No retries conceal nondeterministic failures.
