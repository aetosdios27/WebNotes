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
 * The wall filter encoded in a query string: "pinned" when `?pinned` is
 * present, otherwise the `?folder=` value (URLSearchParams already decodes
 * it), otherwise "all".
 */
export function wallFilterFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  if (params.has("pinned")) return "pinned";
  return params.get("folder") || "all";
}

/** Browser tab title for a note, or the plain app title when none is open. */
export function noteDocumentTitle(title: string | null | undefined): string {
  return `${title || "Untitled"} · WebNotes`;
}
