import { describe, expect, test } from "bun:test";
import { createSessionGuard, resolveRestoredNote } from "./undo-restore";
import type { Note } from "@/lib/storage/types";

const note = (folderId: string | null): Note => ({
  id: "n",
  title: "t",
  content: "",
  folderId,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("createSessionGuard", () => {
  test("invalidate voids tokens issued before the switch", () => {
    const guard = createSessionGuard();
    const token = guard.token();
    expect(guard.isValid(token)).toBe(true);
    guard.invalidate();
    expect(guard.isValid(token)).toBe(false);
    expect(guard.isValid(guard.token())).toBe(true);
  });
});

describe("resolveRestoredNote", () => {
  test("keeps the folder when it still exists", () => {
    const { note: restored, folderDropped } = resolveRestoredNote(note("f"), ["f"]);
    expect(folderDropped).toBe(false);
    expect(restored.folderId).toBe("f");
  });
  test("moves to All notes when the folder was deleted", () => {
    const { note: restored, folderDropped } = resolveRestoredNote(note("f"), []);
    expect(folderDropped).toBe(true);
    expect(restored.folderId).toBe(null);
  });
  test("leaves folderless notes folderless", () => {
    const { note: restored, folderDropped } = resolveRestoredNote(note(null), []);
    expect(folderDropped).toBe(false);
    expect(restored.folderId).toBe(null);
  });
});
