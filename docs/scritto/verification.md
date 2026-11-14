# Rolling text verification

Scritto API and Recipes were read before implementation:
https://github.com/JaceThings/Scritto/wiki/API
https://github.com/JaceThings/Scritto/wiki/Recipes

`@scritto/react` is pinned to 0.1.0. The wrapper uses the existing normal duration
(200ms) and `--ease-settle`, with 180ms for switcher counts, auto edge fading,
and the library's default reduced-motion handling. Numbers use en-US Intl formatting.
An update within twice the duration lands instantly, clearing previous ghosts.
Mounts do not animate. Count slots reserve three digits; larger totals can grow.

Applied only to wall counts, search number, save word, switcher result number,
theme tooltip's changing word, and the open editor's updated time. Card and
switcher preview timestamps remain plain. The open note refreshes its day label
every 30 seconds and resets the animation when switching notes.
Zero wall counts stay visible to support 0↔1 without mounting/removing the slot.
No additional animation locations were added.

## Browser observations

Checked Chromium through T3 preview, signed out with local notes, light and dark
at 1280×800 and 390×844 CSS pixels. Screenshots are settled captures, not animation
frame sequences: [light desktop](light-1280.png), [dark desktop](dark-1280.png),
[light phone](light-390.png), [dark phone](dark-390.png).

- Created notes and returned Home in each combination. Creation navigates directly
  into the editor, so wall counts and search number are offscreen at creation.
  Returning Home mounts the current count without a roll from empty.
- Context-menu pin/unpin and deletion leave the wall visible: observed
  `scrittochange` after events with animate=true for pinned 0→1 / 1→0 and total
  8→7 in both the All notes tab and search pill. Numeric trend is inferred.
- Six pin/unpin clicks about 50ms apart: first animated, following updates landed
  instantly; zero running shadow animations after 500ms. No ghost pile-ups seen.
- Switcher search inputs 40ms apart produced counts 5→0→5→7; first animated,
  following updates instant, zero shadow animations after settling.
- Saving→Saved observed during local persistence. Offline→Saved tested by overriding
  navigator.onLine and dispatching offline/online events at desktop and phone
  widths. This verifies the application's status path, **not actual network
  interception**; preview has no network-emulation control. Save status is hidden
  at phone widths by the existing stylesheet, and stays that way.
- Hovered theme tooltip and toggled theme: changing word emitted animate=true.
  The accessible button label continues to update normally.
- Open-note time emitted animate=true when an update crossed a clock minute.
- Reload console had no React hydration warnings. Earlier API 404/session errors
  coincided with temporarily hiding API routes for the desktop export.

Neighbour positions before/after pin and deletion were identical in each theme:

| Width | Element | Before (x,y), CSS px | After (x,y), CSS px |
| --- | --- | --- | --- |
| 1280 | Pinned tab | 183.389, 68.984 | 183.389, 68.984 |
| 1280 | ⌘K hint | 789.824, 17.744 | 789.824, 17.744 |
| 1280 | Theme button | 1105.811, 10 | 1105.811, 10 |
| 390 | Pinned tab | 149.365, 66.982 | 149.365, 66.982 |
| 390 | Theme button | 258.037, 10 | 258.037, 10 |

The ⌘K hint is hidden at 390. Document scroll width was 390 at that viewport.
These measurements cover the tested small counts; totals beyond three digits
can legitimately require wider count slots.

## Commands

- `bunx tsc --noEmit -p .`: passed.
- `bun test src/lib`: 66 passed, 0 failed.
- `bunx vitest run src/app/components/NoteSummary.test.tsx`: 19 passed. Vitest
  processes the Scritto packages so their bundled CSS loads through Vite.
- `DIRECT_DATABASE_URL=postgresql://u DATABASE_URL=postgresql://u AUTH_SECRET=x bun run build`: passed.
- Same build with `NEXT_PUBLIC_IS_DESKTOP=true`, temporarily hiding `src/app/api`
  as the desktop script does and restoring it in finally: passed; exported `/`,
  `/signin`, `/auth/desktop`, and `/_not-found`.
- Desktop initially failed on the existing request-dependent sign-in page. Its
  desktop branch now renders the existing unavailable-sign-in state without
  accessing headers, session or search parameters. Web sign-in is unchanged.
- No `e2e` directory or `test:ui` script exists on this origin/main.
- ESLint could not initialize: existing configuration reports a circular JSON
  structure in the React plugin; not changed here.

The exported HTML also loaded in a plain static browser without React hydration
warnings. Without the Tauri runtime and auth API, this environment logged
session-fetch errors. This is not a full Tauri binary runtime test.
