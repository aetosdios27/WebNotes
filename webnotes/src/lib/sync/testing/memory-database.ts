import type { Note, NoteUpdate } from "@prisma/client";
import type { SyncDatabase, SyncTransaction } from "../update-log";

type Snapshot = Pick<Note, "yjsState" | "version">;
type Update = Pick<NoteUpdate, "id" | "noteId" | "data">;

// Repeatable-read transactions use a frozen view. Write transactions serialize,
// commit atomically, and roll back on error, like the database operations we use.
export class MemoryDatabase implements SyncDatabase {
  snapshots = new Map<string, Snapshot>([
    ["note", { yjsState: null, version: 0 }],
  ]);
  rows: Update[] = [];
  nextId = BigInt(1);
  beforeWrite: (() => Promise<void>) | undefined;
  afterSnapshotRead: (() => Promise<void>) | undefined;
  failDelete = false;
  failCount = false;
  private writes: Promise<void> = Promise.resolve();

  note: SyncDatabase["note"] = {
    findUnique: async ({ where }) => {
      const note = this.snapshots.get(where.id);
      await this.afterSnapshotRead?.();
      return note ? { ...note } : null;
    },
    updateMany: async ({ where, data }) => {
      const note = this.snapshots.get(where.id);
      if (!note || note.version !== where.version) return { count: 0 };
      this.snapshots.set(where.id, {
        yjsState: data.yjsState,
        version: note.version + data.version.increment,
      });
      return { count: 1 };
    },
  };

  noteUpdate: SyncDatabase["noteUpdate"] = {
    create: async ({ data }) => {
      const row = { ...data, id: this.nextId++ };
      this.rows.push(row);
      return row;
    },
    count: async ({ where }) => {
      if (this.failCount) throw new Error("count failed");
      return this.rows.filter((row) => row.noteId === where.noteId).length;
    },
    findMany: async ({ where }) => this.rows
      .filter((row) => row.noteId === where.noteId)
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      .map(({ id, data }) => ({ id, data })),
    deleteMany: async ({ where }) => {
      if (this.failDelete) throw new Error("delete failed");
      const previous = this.rows.length;
      this.rows = this.rows.filter((row) => !(
        row.noteId === where.noteId &&
        row.id <= where.id.lte && where.id.in.includes(row.id)
      ));
      return { count: previous - this.rows.length };
    },
  };

  private copy() {
    const view = new MemoryDatabase();
    view.snapshots = new Map(this.snapshots);
    view.rows = [...this.rows];
    view.nextId = this.nextId;
    view.failDelete = this.failDelete;
    return view;
  }

  async $transaction<T>(
    fn: (tx: SyncTransaction) => Promise<T>,
    options?: { isolationLevel: "RepeatableRead" }
  ): Promise<T> {
    if (options?.isolationLevel === "RepeatableRead") {
      const view = this.copy();
      view.afterSnapshotRead = this.afterSnapshotRead;
      this.afterSnapshotRead = undefined;
      return fn(view);
    }

    const hook = this.beforeWrite;
    this.beforeWrite = undefined;
    await hook?.();

    const previous = this.writes;
    let release = () => {};
    this.writes = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const view = this.copy();
      const initialIds = new Set(this.rows.map((row) => row.id));
      const result = await fn(view);
      this.snapshots = view.snapshots;
      // Appends do not lock the note and may commit during this transaction.
      this.rows = [
        ...view.rows,
        ...this.rows.filter((row) => !initialIds.has(row.id)),
      ];
      return result;
    } finally {
      release();
    }
  }
}
