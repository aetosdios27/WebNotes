import { describe, expect, mock, test } from "bun:test";
import type { Note } from "./types";

type ListInput = { limit: number; cursor?: string };
const list = mock(async (_input: ListInput): Promise<{
  notes: Note[];
  nextCursor?: string;
}> => ({ notes: [] }));

mock.module("@/lib/trpc/client", () => ({
  trpcVanilla: { notes: { list: { query: list } } },
}));
const { CloudStorageAdapter } = await import("./cloud-storage");

const notes: Note[] = Array.from({ length: 230 }, (_, index) => ({
  id: `note-${index}`,
  title: `Title ${index}`,
  content: `Content ${index}`,
  folderId: null,
  isPinned: false,
  pinnedAt: null,
  font: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}));

describe("CloudStorageAdapter.getNotes", () => {
  test("loads all 230 notes once in server order using maximum-size pages", async () => {
    list.mockClear();
    list.mockImplementation(async ({ limit, cursor }) => {
      const start = cursor ? notes.findIndex((note) => note.id === cursor) + 1 : 0;
      const page = notes.slice(start, start + limit);
      return {
        notes: page,
        nextCursor: start + limit < notes.length ? page.at(-1)?.id : undefined,
      };
    });

    const result = await new CloudStorageAdapter().getNotes();
    expect(result).toEqual(notes);
    expect(new Set(result.map((note) => note.id)).size).toBe(230);
    expect(list.mock.calls).toEqual([
      [{ limit: 100, cursor: undefined }],
      [{ limit: 100, cursor: "note-99" }],
      [{ limit: 100, cursor: "note-199" }],
    ]);
  });

  test("stops on a repeated cursor without duplicating returned notes", async () => {
    list.mockClear();
    list.mockImplementation(async () => ({
      notes: notes.slice(0, 100),
      nextCursor: "note-99",
    }));

    expect(await new CloudStorageAdapter().getNotes()).toEqual(notes.slice(0, 100));
    expect(list).toHaveBeenCalledTimes(2);
  });

  test("stops on a cursor cycle", async () => {
    list.mockClear();
    list.mockImplementation(async ({ cursor }) => ({
      notes: [],
      nextCursor: cursor === "a" ? "b" : "a",
    }));

    expect(await new CloudStorageAdapter().getNotes()).toEqual([]);
    expect(list).toHaveBeenCalledTimes(3);
  });

  test("returns an empty list when there are no notes", async () => {
    list.mockClear();
    list.mockImplementation(async () => ({ notes: [] }));
    expect(await new CloudStorageAdapter().getNotes()).toEqual([]);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
