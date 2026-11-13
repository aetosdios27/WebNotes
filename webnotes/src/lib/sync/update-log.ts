import type { Note, NoteUpdate } from "@prisma/client";
import { mergeState } from "./state";

type Snapshot = Pick<Note, "yjsState" | "version">;
type Update = Pick<NoteUpdate, "id" | "data">;

export interface SyncTransaction {
  note: {
    findUnique(args: {
      where: { id: string };
      select: { yjsState: true; version: true };
    }): Promise<Snapshot | null>;
    updateMany(args: {
      where: { id: string; version: number };
      data: { yjsState: Uint8Array<ArrayBuffer>; version: { increment: number } };
    }): Promise<{ count: number }>;
  };
  noteUpdate: {
    findMany(args: {
      where: { noteId: string };
      orderBy: { id: "asc" };
      select: { id: true; data: true };
    }): Promise<Update[]>;
    deleteMany(args: {
      where: { noteId: string; id: { lte: bigint; in: bigint[] } };
    }): Promise<{ count: number }>;
  };
}

export interface SyncDatabase extends SyncTransaction {
  noteUpdate: SyncTransaction["noteUpdate"] & {
    create(args: {
      data: { noteId: string; data: Uint8Array<ArrayBuffer> };
    }): Promise<unknown>;
    count(args: { where: { noteId: string } }): Promise<number>;
  };
  $transaction<T>(
    fn: (tx: SyncTransaction) => Promise<T>,
    options?: { isolationLevel: "RepeatableRead" }
  ): Promise<T>;
}

export function createUpdateLog(db: SyncDatabase) {
  function readSnapshotAndUpdates(noteId: string) {
    // A compaction between these reads must not hide rows from an older snapshot.
    return db.$transaction(
      async (tx) => {
        const note = await tx.note.findUnique({
          where: { id: noteId },
          select: { yjsState: true, version: true },
        });
        if (!note) return null;

        const updates = await tx.noteUpdate.findMany({
          where: { noteId },
          orderBy: { id: "asc" },
          select: { id: true, data: true },
        });
        return { note, updates };
      },
      { isolationLevel: "RepeatableRead" }
    );
  }

  async function appendUpdate(noteId: string, bytes: Uint8Array) {
    await db.noteUpdate.create({
      data: { noteId, data: new Uint8Array(bytes) },
    });
  }

  async function readState(noteId: string): Promise<Uint8Array | null> {
    const state = await readSnapshotAndUpdates(noteId);
    if (!state || (!state.note.yjsState && state.updates.length === 0)) {
      return null;
    }
    return mergeState(state.note.yjsState, state.updates.map((row) => row.data));
  }

  async function compact(noteId: string): Promise<boolean> {
    const state = await readSnapshotAndUpdates(noteId);
    const lastUpdate = state?.updates.at(-1);
    if (!state || !lastUpdate) return false;

    const merged = mergeState(
      state.note.yjsState,
      state.updates.map((row) => row.data)
    );

    return db.$transaction(async (tx) => {
      const result = await tx.note.updateMany({
        where: { id: noteId, version: state.note.version },
        data: { yjsState: new Uint8Array(merged), version: { increment: 1 } },
      });
      if (result.count === 0) return false;

      await tx.noteUpdate.deleteMany({
        where: {
          noteId,
          // Sequence allocation is not commit order: delete only rows we merged.
          id: { lte: lastUpdate.id, in: state.updates.map((row) => row.id) },
        },
      });
      return true;
    });
  }

  async function compactIfNeeded(noteId: string): Promise<void> {
    try {
      const count = await db.noteUpdate.count({ where: { noteId } });
      if (count > 200) {
        await compact(noteId);
      }
    } catch (error) {
      // The append is already durable; maintenance must not fail the save.
      console.error("Yjs update log compaction failed:", error);
    }
  }

  return { appendUpdate, readState, compact, compactIfNeeded };
}
