import { describe, expect, test } from "bun:test";
import { DELETE_UNDO_MS, PendingDeletes, journalKey, recoverAfterAuth } from "./pending-deletes";

function fixture(remove: (id: string) => Promise<void> = async () => {}) {
  const values = new Map<string, string>();
  const journal: Storage = {
    get length() { return values.size; },
    key: i => [...values.keys()][i] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
    clear: () => values.clear(),
  };
  const errors: unknown[] = [];
  return { journal, errors, queue: new PendingDeletes(journal, ({ id }) => remove(id), e => errors.push(e)) };
}

describe("deferred note deletion", () => {
  test("Undo cancels the persisted intent without touching the original note", async () => {
    const removed: string[] = [];
    const { queue } = fixture(async id => { removed.push(id); });
    const undo = queue.stage({ id: "a", scope: "device" });
    expect(queue.has("a")).toBe(true);
    expect(removed).toEqual([]);
    expect(undo()).toBe(true);
    await queue.recover("device");
    expect(removed).toEqual([]);
    expect(undo()).toBe(false);
  });
  test("next load commits interrupted deletes, only for the original account", async () => {
    const removed: string[] = [];
    const { journal } = fixture(async id => { removed.push(id); });
    // A previous session staged this and its Undo window has since closed.
    journal.setItem(journalKey("a"), JSON.stringify({ id: "a", scope: "owner", deadline: 0 }));
    const restarted = new PendingDeletes(journal, async ({ id }) => { removed.push(id); }, () => {});
    await restarted.recover("other");
    expect(removed).toEqual([]);
    await restarted.recover("owner");
    expect(removed).toEqual(["a"]);
  });
  test("reconnecting keeps the current Undo window open", async () => {
    const removed: string[] = [];
    const { queue } = fixture(async id => { removed.push(id); });
    const undo = queue.stage({ id: "a", scope: "device" });
    await queue.recover("device");
    expect(removed).toEqual([]);
    expect(undo()).toBe(true);
  });
  test("another tab does not commit a deletion that still has an active Undo window", async () => {
    const removed: string[] = [];
    const { journal, queue } = fixture(async id => { removed.push(id); });
    const undo = queue.stage({ id: "a", scope: "device" });
    const otherTab = new PendingDeletes(journal, async ({ id }) => { removed.push(id); }, () => {});
    await otherTab.recover("device");
    expect(removed).toEqual([]);
    expect(undo()).toBe(true);
  });
  test("another tab commits the deletion once the Undo window has closed", async () => {
    const removed: string[] = [];
    const { journal } = fixture(async id => { removed.push(id); });
    journal.setItem(journalKey("a"), JSON.stringify({ id: "a", scope: "owner", deadline: 0 }));
    const otherTab = new PendingDeletes(journal, async ({ id }) => { removed.push(id); }, () => {});
    await otherTab.recover("owner");
    expect(removed).toEqual(["a"]);
    expect(otherTab.has("a")).toBe(false);
  });
  test("failed commits remain hidden and retry", async () => {
    let fails = true;
    const { queue, journal, errors } = fixture(async () => { if (fails) throw new Error("offline"); });
    journal.setItem(journalKey("a"), JSON.stringify({ id: "a", scope: "device", deadline: 0 }));
    await queue.recover("device");
    expect(errors).toHaveLength(1);
    expect(queue.has("a")).toBe(true);
    fails = false;
    await queue.recover("device");
    expect(queue.has("a")).toBe(false);
  });
  test("separate deletes undo independently and the deadline commits once", async () => {
    const removed: string[] = [];
    const { queue } = fixture(async id => { removed.push(id); });
    const undo = queue.stage({ id: "a", scope: "device" });
    queue.stage({ id: "b", scope: "device" });
    expect(undo()).toBe(true);
    await new Promise(resolve => setTimeout(resolve, DELETE_UNDO_MS + 50));
    expect(removed).toEqual(["b"]);
    expect(queue.has("b")).toBe(false);
  }, 10_000);
});

describe("recoverAfterAuth", () => {
  test("waits for auth refresh before selecting the recovery scope", async () => {
    let userId: string | null = null;
    const storage = {
      get deleteScope() { return userId ?? "device"; },
      refreshAuth: async () => { userId = "owner"; },
    };
    const recovered: string[] = [];
    await recoverAfterAuth(storage, false, async scope => { recovered.push(scope); });
    expect(recovered).toEqual(["owner"]);
  });
  test("falls back to device scope when no auth refresh is available", async () => {
    const recovered: string[] = [];
    await recoverAfterAuth({ deleteScope: "device" }, false, async scope => { recovered.push(scope); });
    expect(recovered).toEqual(["device"]);
  });
  test("recovers with the Tauri scope without refreshing auth", async () => {
    let refreshed = false;
    const storage = { deleteScope: "device", refreshAuth: async () => { refreshed = true; } };
    const recovered: string[] = [];
    await recoverAfterAuth(storage, true, async scope => { recovered.push(scope); });
    expect(recovered).toEqual(["tauri"]);
    expect(refreshed).toBe(false);
  });
});
