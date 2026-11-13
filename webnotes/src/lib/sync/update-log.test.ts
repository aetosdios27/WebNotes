import { describe, expect, spyOn, test } from "bun:test";
import { COMPACT_AFTER_ROWS, createUpdateLog } from "./update-log";
import { mergeState } from "./state";
import { MemoryDatabase } from "./testing/memory-database";
import { makeUpdate, values } from "./testing/updates";

describe("append-only update log", () => {
  test.each([false, true])("overlapping saves both survive (reverse: %s)", async (reverse) => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    const first = makeUpdate("first", "one");
    const second = makeUpdate("second", "two");
    const updates = reverse ? [second, first] : [first, second];

    await Promise.all(updates.map((bytes) => log.appendUpdate("note", bytes)));
    expect(values(await log.readState("note"))).toEqual({ first: "one", second: "two" });
  });

  test("the same overlapping schedule loses an edit with the old read-merge-write", async () => {
    let stored: Uint8Array | null = null;
    const staleFirstRead = stored;
    const staleSecondRead = stored;
    stored = mergeState(staleFirstRead, [makeUpdate("first", "one")]);
    stored = mergeState(staleSecondRead, [makeUpdate("second", "two")]);
    expect(values(stored)).toEqual({ second: "two" });
  });

  test("compaction preserves the merged state and clears only this note's rows", async () => {
    const db = new MemoryDatabase();
    db.snapshots.set("note", { yjsState: makeUpdate("existing", "snapshot"), version: 7 });
    db.snapshots.set("other", { yjsState: null, version: 0 });
    const log = createUpdateLog(db);
    await log.appendUpdate("note", makeUpdate("first", "one"));
    await log.appendUpdate("note", makeUpdate("second", "two"));
    await log.appendUpdate("other", makeUpdate("other", "untouched"));
    const before = await log.readState("note");

    expect(await log.compact("note")).toBe(true);
    expect(await log.readState("note")).toEqual(before);
    expect(db.rows.map((row) => row.noteId)).toEqual(["other"]);
    expect(db.snapshots.get("note")?.version).toBe(8);
    expect(values(await log.readState("other"))).toEqual({ other: "untouched" });
  });

  test("an append between the read and compaction transaction survives", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    await log.appendUpdate("note", makeUpdate("first", "one"));
    db.beforeWrite = () => log.appendUpdate("note", makeUpdate("second", "two"));

    expect(await log.compact("note")).toBe(true);
    expect(db.rows).toHaveLength(1);
    expect(values(await log.readState("note"))).toEqual({ first: "one", second: "two" });
  });

  test("a late commit with a lower sequence id is not deleted without being merged", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    const reservedId = db.nextId++;
    await log.appendUpdate("note", makeUpdate("first", "one"));
    db.beforeWrite = async () => {
      db.rows.push({ id: reservedId, noteId: "note", data: makeUpdate("late", "commit") });
    };

    await log.compact("note");
    expect(db.rows.map((row) => row.id)).toEqual([reservedId]);
    expect(values(await log.readState("note"))).toEqual({ first: "one", late: "commit" });
  });

  test("a stale-version compaction is a no-op, including for newer rows", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    await log.appendUpdate("note", makeUpdate("first", "one"));
    db.beforeWrite = async () => {
      expect(await log.compact("note")).toBe(true);
      await log.appendUpdate("note", makeUpdate("second", "two"));
    };

    expect(await log.compact("note")).toBe(false);
    expect(db.snapshots.get("note")?.version).toBe(1);
    expect(db.rows).toHaveLength(1);
    expect(values(await log.readState("note"))).toEqual({ first: "one", second: "two" });
  });

  test("two concurrent compactions commit only one snapshot", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    await log.appendUpdate("note", makeUpdate("first", "one"));
    const results = await Promise.all([log.compact("note"), log.compact("note")]);
    expect(results.sort()).toEqual([false, true]);
    expect(db.snapshots.get("note")?.version).toBe(1);
    expect(values(await log.readState("note"))).toEqual({ first: "one" });
  });

  test("readState remains consistent when compaction happens between its reads", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    await log.appendUpdate("note", makeUpdate("first", "one"));
    db.afterSnapshotRead = async () => { await log.compact("note"); };

    expect(values(await log.readState("note"))).toEqual({ first: "one" });
  });

  test("a failed deletion rolls back the snapshot and version", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    await log.appendUpdate("note", makeUpdate("first", "one"));
    db.failDelete = true;

    await expect(log.compact("note")).rejects.toThrow("delete failed");
    expect(db.snapshots.get("note")).toEqual({ yjsState: null, version: 0 });
    expect(db.rows).toHaveLength(1);
    expect(values(await log.readState("note"))).toEqual({ first: "one" });
  });

  test("only compacts above COMPACT_AFTER_ROWS rows, and maintenance failure does not fail the save", async () => {
    const db = new MemoryDatabase();
    const log = createUpdateLog(db);
    const bytes = makeUpdate("first", "one");
    for (let i = 0; i < COMPACT_AFTER_ROWS; i++) await log.appendUpdate("note", bytes);
    await log.compactIfNeeded("note");
    expect(db.rows).toHaveLength(COMPACT_AFTER_ROWS);

    await log.appendUpdate("note", bytes);
    db.failDelete = true;
    const errors = spyOn(console, "error").mockImplementation(() => {});
    try {
      await log.compactIfNeeded("note");
      expect(db.rows).toHaveLength(COMPACT_AFTER_ROWS + 1);
      expect(values(await log.readState("note"))).toEqual({ first: "one" });
      db.failCount = true;
      await log.compactIfNeeded("note");
    } finally {
      errors.mockRestore();
    }
    db.failDelete = false;
    db.failCount = false;
    await log.compactIfNeeded("note");
    expect(db.rows).toHaveLength(0);
  });

  test("empty and missing notes have nothing to compact", async () => {
    const log = createUpdateLog(new MemoryDatabase());
    expect(await log.readState("note")).toBeNull();
    expect(await log.readState("missing")).toBeNull();
    expect(await log.compact("note")).toBe(false);
    expect(await log.compact("missing")).toBe(false);
  });
});
