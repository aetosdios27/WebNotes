import { z } from "zod";

export const DELETE_UNDO_MS = 8_000;
const prefix = "webnotes-pending-delete:";
const entrySchema = z.object({
  id: z.string(),
  scope: z.string(),
  deadline: z.number().optional(),
});

/** Key under which a pending deletion is journaled. Exposed for cross-tab coordination and tests. */
export const journalKey = (id: string) => prefix + id;

/** The journal is written before hiding a note; interrupted commits retry on load. */
export class PendingDeletes {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private tail: Promise<void> = Promise.resolve();
  private committing = new Set<string>();

  constructor(
    private journal: Storage,
    private remove: (entry: { id: string; scope: string }) => Promise<void>,
    private failed: (error: unknown) => void,
  ) {}

  entries(): Array<{ id: string; scope: string; deadline: number }> {
    const entries: Array<{ id: string; scope: string; deadline: number }> = [];
    for (let i = 0; i < this.journal.length; i++) {
      const key = this.journal.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const result = entrySchema.safeParse(JSON.parse(this.journal.getItem(key) ?? "null"));
        if (result.success) {
          const { id, scope, deadline } = result.data;
          // Entries written before the deadline was persisted are already overdue.
          entries.push({ id, scope, deadline: deadline ?? 0 });
        }
      } catch { /* Ignore unrelated or corrupt journal entries. */ }
    }
    return entries;
  }

  has(id: string) { return this.journal.getItem(journalKey(id)) !== null; }

  stage(entry: { id: string; scope: string }): () => boolean {
    const full = { ...entry, deadline: Date.now() + DELETE_UNDO_MS };
    this.journal.setItem(journalKey(entry.id), JSON.stringify(full));
    this.timers.set(entry.id, setTimeout(() => { void this.commit(full); }, DELETE_UNDO_MS));
    return () => {
      // Past the deadline another tab may already be committing; an Undo now
      // could show a note that the server is deleting.
      if (Date.now() >= full.deadline) return false;
      if (this.committing.has(entry.id) || !this.has(entry.id)) return false;
      this.journal.removeItem(journalKey(entry.id));
      clearTimeout(this.timers.get(entry.id));
      this.timers.delete(entry.id);
      return true;
    };
  }

  async commit(entry: { id: string; scope: string }): Promise<void> {
    if (!this.has(entry.id) || this.committing.has(entry.id)) return;
    this.committing.add(entry.id);
    clearTimeout(this.timers.get(entry.id));
    this.timers.delete(entry.id);
    const previous = this.tail;
    let release = () => {};
    this.tail = new Promise<void>(resolve => { release = resolve; });
    try {
      await previous;
      await this.remove(entry);
      this.journal.removeItem(journalKey(entry.id));
    } catch (error) {
      this.failed(error);
    } finally {
      this.committing.delete(entry.id);
      release();
    }
  }

  async recover(scope: string) {
    // A tab that stages a deletion owns its Undo window. Another tab (or a later
    // load) must not commit an entry before that window closes, so recovery only
    // commits entries whose deadline has already passed.
    const now = Date.now();
    await Promise.all(this.entries()
      .filter(entry => !this.timers.has(entry.id)
        && entry.deadline <= now
        && (entry.scope === scope || entry.scope === "device"))
      .map(entry => this.commit(entry)));
  }
}

/**
 * Resolve the recovery scope after the auth session has settled. On reconnect the
 * adapter may still be verifying the session, so reading `deleteScope` too early
 * yields `"device"` and skips deletions staged under the signed-in account.
 */
export async function recoverAfterAuth(
  storage: { refreshAuth?: () => Promise<void>; deleteScope: string },
  isTauri: boolean,
  recover: (scope: string) => Promise<void>,
): Promise<void> {
  if (!isTauri) await storage.refreshAuth?.();
  await recover(isTauri ? "tauri" : storage.deleteScope);
}
