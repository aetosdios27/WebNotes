import { z } from "zod";

export const DELETE_UNDO_MS = 8_000;
const prefix = "webnotes-pending-delete:";
const entrySchema = z.object({ id: z.string(), scope: z.string() });
type Entry = z.infer<typeof entrySchema>;

/** The journal is written before hiding a note; interrupted commits retry on load. */
export class PendingDeletes {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private tail: Promise<void> = Promise.resolve();
  private committing = new Set<string>();

  constructor(
    private journal: Storage,
    private remove: (entry: Entry) => Promise<void>,
    private failed: (error: unknown) => void,
  ) {}

  entries(): Entry[] {
    const entries: Entry[] = [];
    for (let i = 0; i < this.journal.length; i++) {
      const key = this.journal.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const result = entrySchema.safeParse(JSON.parse(this.journal.getItem(key) ?? "null"));
        if (result.success) entries.push(result.data);
      } catch { /* Ignore unrelated or corrupt journal entries. */ }
    }
    return entries;
  }

  has(id: string) { return this.journal.getItem(prefix + id) !== null; }

  stage(entry: Entry): () => boolean {
    this.journal.setItem(prefix + entry.id, JSON.stringify(entry));
    this.timers.set(entry.id, setTimeout(() => { void this.commit(entry); }, DELETE_UNDO_MS));
    return () => {
      if (this.committing.has(entry.id) || !this.has(entry.id)) return false;
      this.journal.removeItem(prefix + entry.id);
      clearTimeout(this.timers.get(entry.id));
      this.timers.delete(entry.id);
      return true;
    };
  }

  async commit(entry: Entry): Promise<void> {
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
      this.journal.removeItem(prefix + entry.id);
    } catch (error) {
      this.failed(error);
    } finally {
      this.committing.delete(entry.id);
      release();
    }
  }

  async recover(scope: string) {
    await Promise.all(this.entries().filter(entry => !this.timers.has(entry.id) && (entry.scope === scope || entry.scope === "device")).map(entry => this.commit(entry)));
  }
}
