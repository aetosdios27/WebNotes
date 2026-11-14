import { describe, expect, test } from "bun:test";
import { DELETE_UNDO_MS, PendingDeletes } from "./pending-deletes";

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
    const { queue, journal } = fixture(async id => { removed.push(id); });
    queue.stage({ id: "a", scope: "owner" });
    const restarted = new PendingDeletes(journal, async ({ id }) => { removed.push(id); }, () => {});
    await restarted.recover("other");
    expect(removed).toEqual([]);
    await restarted.recover("owner");
    expect(removed).toEqual(["a"]);
    await queue.recover("owner");
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
  test("failed commits remain hidden and retry", async () => {
    let fails = true;
    const { queue, errors } = fixture(async () => { if (fails) throw new Error("offline"); });
    queue.stage({ id: "a", scope: "device" });
    await queue.commit({ id: "a", scope: "device" });
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
