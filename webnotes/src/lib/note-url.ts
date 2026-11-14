// Pure helpers for the app's URL scheme. The note URL lives at `/n/<id>`,
// the wall at `/` (optionally `/?:pinned` or `/?folder=<id>`), and the
// settings sheet keeps its own `/settings/<section>` space. These functions
// hold no state and never touch `window.history`, so they are trivial to unit
// test and to reuse on both the web and the Tauri static export.

/** URL pathname for an open note. */
export function notePath(id: string): string {
  return `/n/${encodeURIComponent(id)}`;
}

/** The note id encoded in a pathname, or null when it is not a note URL. */
export function noteIdFromPath(pathname: string): string | null {
  const match = /^\/n\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * URL for a wall filter. "all" (and anything unrecognised) maps to the bare
 * `/`; "pinned" maps to `/?pinned`; a folder id maps to `/?folder=<id>`.
 */
export function wallPath(filter: string): string {
  if (filter === "pinned") return "/?pinned";
  if (filter && filter !== "all") return `/?folder=${encodeURIComponent(filter)}`;
  return "/";
}

/**
 * The wall filter encoded in a set of search params: "pinned" when `?pinned`
 * is present, otherwise the decoded `?folder=` value, otherwise "all".
 * Accepts a query string or any `URLSearchParams`-like object (including
 * Next's `ReadonlyURLSearchParams`).
 */
export function wallFilterFromSearch(
  search: { has(key: string): boolean; get(key: string): string | null } | string,
): string {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  if (params.has("pinned")) return "pinned";
  const folder = params.get("folder");
  if (folder === null || folder === "") return "all";
  try {
    const decoded = decodeURIComponent(folder);
    return decoded || "all";
  } catch {
    return "all";
  }
}

/** Browser tab title for a note, or the plain app title when none is open. */
export function noteDocumentTitle(title: string | null | undefined): string {
  return `${title || "Untitled"} · WebNotes`;
}
