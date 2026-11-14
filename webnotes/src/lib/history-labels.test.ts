import { describe, expect, test } from "bun:test";
import { historyLabels, readLabel } from "./history-labels";

/** A minimal browser history: a stack of entries and a cursor. */
function fakeBrowser() {
  let entries: { state: unknown; url: string }[] = [{ state: null, url: "/" }];
  let cursor = 0;
  const store = new Map<string, string>();
  const history = {
    get state() { return entries[cursor].state; },
    pushState(state: unknown, _: string, url?: string) {
      entries = entries.slice(0, cursor + 1);
      entries.push({ state, url: url ?? entries[cursor].url });
      cursor++;
    },
    replaceState(state: unknown, _: string, url?: string) {
      entries[cursor] = { state, url: url ?? entries[cursor].url };
    },
    back() { cursor = Math.max(0, cursor - 1); },
    forward() { cursor = Math.min(entries.length - 1, cursor + 1); },
  } as unknown as History;
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  return {
    history,
    storage,
    /** A full-page navigation: a new unlabelled entry that drops forward ones. */
    hardNavigate(url: string) { history.pushState(null, "", url); },
    get url() { return entries[cursor].url; },
  };
}

describe("history labels", () => {
  test("pushes go forward; back and forward stay within this run", () => {
    const b = fakeBrowser();
    const h = historyLabels(b);
    const home = h.adopt();
    expect(h.canGoBack(home)).toBe(false);
    h.push("/n/a");
    const atB = h.push("/n/b");
    expect(h.canGoBack(atB)).toBe(true);
    expect(h.canGoForward(atB)).toBe(false);
    b.history.back();
    const atA = readLabel(b.history.state)!;
    expect(h.canGoForward(atA)).toBe(true);
  });

  test("a full-page navigation drops forward entries, so Forward turns off", () => {
    const b = fakeBrowser();
    const h = historyLabels(b);
    h.adopt();
    h.push("/n/a");
    h.push("/n/b");
    b.history.back();
    // Sign out: a new document entry the app never labelled.
    b.hardNavigate("/");
    const landed = h.adopt();
    expect(h.canGoForward(landed)).toBe(false);
    // Back would leave this run of the app (to the page before), so it is off.
    expect(h.canGoBack(landed)).toBe(false);
  });

  test("an entry pushed by Settings is part of the same numbering", () => {
    const b = fakeBrowser();
    const h = historyLabels(b);
    h.adopt();
    h.push("/n/a");
    h.push("/n/b");
    b.history.back(); // at A, B is forward
    h.push("/settings/account"); // drops B
    b.history.back(); // close Settings
    const atA = readLabel(b.history.state)!;
    expect(b.url).toBe("/n/a");
    // Forward now leads to Settings, which is what the browser really holds.
    expect(h.canGoForward(atA)).toBe(true);
    b.history.forward();
    expect(b.url).toBe("/settings/account");
  });

  test("replace keeps the entry's place", () => {
    const b = fakeBrowser();
    const h = historyLabels(b);
    h.adopt();
    const pushed = h.push("/n/a");
    expect(h.replace("/")).toEqual(pushed);
    expect(b.url).toBe("/");
  });

  test("labels survive a refresh through sessionStorage", () => {
    const b = fakeBrowser();
    historyLabels(b).adopt();
    historyLabels(b).push("/n/a");
    historyLabels(b).push("/n/b");
    b.history.back();
    const refreshed = historyLabels(b); // same storage, new instance
    expect(refreshed.canGoForward(refreshed.adopt())).toBe(true);
  });
});
