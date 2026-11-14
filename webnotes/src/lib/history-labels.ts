// Labels on browser history entries, so the in-app ← → arrows can mirror the
// browser's own history without keeping a second, drifting copy.
//
// Every entry the app owns carries `{ __webnotes: n, __base: b }`:
// - `n` increases with each push. A push, or a fresh document entry (sign-in,
//   sign-out, a typed URL), drops every forward entry, so the newest label is
//   always the top of the stack. The top survives refreshes in sessionStorage.
// - `b` is the first label of this run of the app. Back stops there instead of
//   walking off to whatever page came before WebNotes.

export type HistoryLabel = { index: number; base: number };

const TOP_KEY = "webnotes:history-top";

export function readLabel(state: unknown): HistoryLabel | null {
  if (!state || typeof state !== "object") return null;
  const { __webnotes, __base } = state as { __webnotes?: unknown; __base?: unknown };
  if (typeof __webnotes !== "number") return null;
  return { index: __webnotes, base: typeof __base === "number" ? __base : __webnotes };
}

type Env = { history: History; storage: Pick<Storage, "getItem" | "setItem"> | null };

function readTop(env: Env): number {
  try {
    return Number(env.storage?.getItem(TOP_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeTop(env: Env, top: number) {
  try {
    env.storage?.setItem(TOP_KEY, String(top));
  } catch {}
}
function withLabel(state: unknown, label: HistoryLabel) {
  const base = state && typeof state === "object" ? state : {};
  return { ...base, __webnotes: label.index, __base: label.base };
}

export function historyLabels(env: Env) {
  /** Label the current entry if nobody has: it is a fresh entry, so it is the new top. */
  function adopt(): HistoryLabel {
    const existing = readLabel(env.history.state);
    if (existing) return existing;
    const index = readTop(env) + 1;
    const label = { index, base: index };
    env.history.replaceState(withLabel(env.history.state, label), "");
    writeTop(env, index);
    return label;
  }
  /** Push a new entry; it drops every forward entry, so it becomes the top. */
  function push(url: string): HistoryLabel {
    const current = adopt();
    const index = Math.max(readTop(env), current.index) + 1;
    const label = { index, base: current.base };
    env.history.pushState(withLabel(null, label), "", url);
    writeTop(env, index);
    return label;
  }
  /** Change the current entry's URL, keeping its place in history. */
  function replace(url: string): HistoryLabel {
    const current = adopt();
    env.history.replaceState(withLabel(env.history.state, current), "", url);
    return current;
  }
  return {
    adopt,
    push,
    replace,
    canGoBack: (label: HistoryLabel) => label.index > label.base,
    canGoForward: (label: HistoryLabel) => label.index < readTop(env),
  };
}

/** The browser's history, labelled. Only call on the client. */
export function browserHistoryLabels() {
  let storage: Env["storage"] = null;
  try {
    storage = window.sessionStorage;
  } catch {}
  return historyLabels({ history: window.history, storage });
}
