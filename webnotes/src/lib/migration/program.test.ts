import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { TRPCError } from "@trpc/server";
import { createOwned } from "../trpc/create-owned";
import { BodyReader, CloudApi, LocalStore, uploadLocalNotes, type Snapshot } from "./program";

function fixture(ids = ["a", "b", "legacy"]) {
  const events: string[] = [];
  const progress = new Map<string, string>();
  const folders = new Map<string, { userId: string }>();
  const notes = new Map<string, { userId: string }>();
  const bodies = new Map<string, string>();
  const date = new Date();
  const snapshot: Snapshot = {
    folders: [{ id: "folder", name: "Local folder", createdAt: date }],
    notes: ids.map((id) => ({
      id, title: id, content: `<p>${id}</p>`, folderId: "folder", createdAt: date, updatedAt: date,
    })),
  };
  let cleared = false;
  let readFailure = false;
  let revision = "";
  let failBody = false;
  let transientFailures = 0;
  let creates = 0;
  let active = 0;
  let peak = 0;
  const ownedCreate = async (map: Map<string, { userId: string }>, id: string) => createOwned({
    userId: "me",
    create: async () => {
      if (map.has(id)) throw { code: "P2002" };
      const value = { userId: "me" };
      map.set(id, value);
      return value;
    },
    findExisting: async () => map.get(id) ?? null,
  });
  const run = () => Effect.runPromise(uploadLocalNotes.pipe(
    Effect.provideService(LocalStore, {
      snapshot: async () => snapshot,
      completed: async (key, version) => progress.get(key) === version,
      checkpoint: async (key, version) => { progress.set(key, version); events.push(`checkpoint:${key}`); },
      finish: async () => { events.push("clear"); cleared = true; },
    }),
    Effect.provideService(CloudApi, {
      createFolder: async (folder) => { events.push("folder"); return ownedCreate(folders, folder.id); },
      createNote: async (note) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        creates++;
        events.push(`create:${note.id}`);
        expect(folders.has("folder")).toBe(true);
        if (transientFailures-- > 0) throw new TypeError("offline");
        expect(note.content).toBe(`<p>${note.id}</p>`);
        return ownedCreate(notes, note.id);
      },
      syncBody: async (id, body) => {
        if (id === "b" && failBody) throw new Error("body rejected");
        events.push(`body:${id}`); bodies.set(id, body);
      },
      isRetryable: (cause) => cause instanceof TypeError,
    }),
    Effect.provideService(BodyReader, { read: async (id) => {
      if (readFailure) throw new Error("IndexedDB unavailable");
      return id === "legacy" ? null : `full-state:${id}${revision}`;
    } }),
  ));
  return { run, events, notes, folders, bodies, progress,
    get cleared() { return cleared; }, get creates() { return creates; }, get peak() { return peak; },
    set readFailure(value: boolean) { readFailure = value; },
    set revision(value: string) { revision = value; },
    set failBody(value: boolean) { failBody = value; },
    set transientFailures(value: number) { transientFailures = value; },
  };
}

describe("device uploads", () => {
  test("folders precede notes, bodies upload, and metadata clears last", async () => {
    const f = fixture();
    expect(await f.run()).toBe(3);
    expect(f.events[0]).toBe("folder");
    expect(f.bodies).toEqual(new Map([["a", "full-state:a"], ["b", "full-state:b"]]));
    expect(f.events.at(-1)).toBe("clear");
    expect(f.cleared).toBe(true);
  });
  test("a failed body retains metadata, then resumes with the same IDs", async () => {
    const f = fixture(); f.failBody = true;
    await expect(f.run()).rejects.toMatchObject({ _tag: "CloudUploadError" });
    expect(f.cleared).toBe(false);
    expect(f.progress.has("note:b")).toBe(false);
    f.failBody = false;
    await f.run();
    expect(f.notes.size).toBe(3);
    expect(f.folders.size).toBe(1);
    expect(f.bodies.size).toBe(2);
    expect(f.cleared).toBe(true);
    expect(f.events.filter((event) => event === "folder")).toHaveLength(1);
  });
  test("an edited cached body is uploaded again after an interrupted migration", async () => {
    const f = fixture(); f.failBody = true;
    await expect(f.run()).rejects.toMatchObject({ _tag: "CloudUploadError" });
    f.revision = ":edited"; f.failBody = false;
    await f.run();
    expect(f.bodies.get("a")).toBe("full-state:a:edited");
    expect(f.cleared).toBe(true);
  });
  test("IndexedDB read failures retain metadata and are typed", async () => {
    const f = fixture(); f.readFailure = true;
    await expect(f.run()).rejects.toMatchObject({ _tag: "BodyReadError" });
    expect(f.cleared).toBe(false);
    f.readFailure = false;
    await f.run();
    expect(f.cleared).toBe(true);
  });
  test("note upload concurrency is bounded", async () => {
    const f = fixture(Array.from({ length: 10 }, (_, index) => String(index)));
    await f.run();
    expect(f.notes.size).toBe(10);
    expect(f.peak).toBe(3);
  });
  test("transient network failures are retried", async () => {
    const f = fixture(); f.transientFailures = 1;
    await f.run();
    expect(f.creates).toBe(4);
    expect(f.cleared).toBe(true);
  });
  test("same-owner duplicate creates succeed without overwriting", async () => {
    const f = fixture();
    const existing = { userId: "me" };
    f.notes.set("a", existing);
    await f.run();
    expect(f.notes.get("a")).toBe(existing);
  });
  test("other-owner duplicate creates fail and retain all local data", async () => {
    const f = fixture(); f.notes.set("a", { userId: "someone-else" });
    await expect(f.run()).rejects.toMatchObject({ _tag: "CloudUploadError", retryable: false });
    expect(f.cleared).toBe(false);
    expect(f.bodies.has("a")).toBe(false);
    expect(f.notes.get("a")?.userId).toBe("someone-else");
  });
  test("non-duplicate database errors are not swallowed", async () => {
    const failure = new Error("unavailable");
    await expect(createOwned({
      userId: "me", create: async () => { throw failure; }, findExisting: async () => ({ userId: "me" }),
    })).rejects.toBe(failure);
  });
  test("duplicate ownership conflicts return CONFLICT", async () => {
    await expect(createOwned({
      userId: "me", create: async () => { throw { code: "P2002" }; }, findExisting: async () => ({ userId: "other" }),
    })).rejects.toBeInstanceOf(TRPCError);
  });
});
