import type { Note } from "@/lib/storage/types";

/**
 * A session guard invalidates undo tokens staged before an account switch. The
 * Undo closure captured a note from the previous account; once the session
 * changes it must no longer restore that note into the current account's view.
 */
export function createSessionGuard() {
  let epoch = 0;
  return {
    token: () => epoch,
    invalidate: () => { epoch += 1; },
    isValid: (token: number) => token === epoch,
  };
}

/**
 * Decide what a restored note should look like. If the note's folder was deleted
 * while it was hidden, the note comes back under "All notes" (no folder) instead
 * of pointing at a folder that no longer exists.
 */
export function resolveRestoredNote(
  note: Note,
  existingFolderIds: string[],
): { note: Note; folderDropped: boolean } {
  const folderDropped =
    note.folderId !== null && !existingFolderIds.includes(note.folderId);
  return {
    note: folderDropped ? { ...note, folderId: null } : note,
    folderDropped,
  };
}
