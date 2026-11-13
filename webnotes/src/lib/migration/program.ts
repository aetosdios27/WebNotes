import { Context, Data, Duration, Effect, Schedule } from "effect";
import type { Folder, Note } from "../storage/types";

export class LocalStoreError extends Data.TaggedError("LocalStoreError")<{
  operation: string; cause: unknown;
}> {}
export class BodyReadError extends Data.TaggedError("BodyReadError")<{
  id: string; cause: unknown;
}> {}
export class CloudUploadError extends Data.TaggedError("CloudUploadError")<{
  operation: string; cause: unknown; retryable: boolean;
}> {}

export interface Snapshot { folders: Folder[]; notes: Note[] }
export class LocalStore extends Context.Service<LocalStore, {
  snapshot: () => Promise<Snapshot>;
  completed: (key: string, version: string) => Promise<boolean>;
  checkpoint: (key: string, version: string) => Promise<void>;
  finish: (snapshot: Snapshot) => Promise<void>;
}>()("migration/LocalStore") {}
export class CloudApi extends Context.Service<CloudApi, {
  createFolder: (folder: Folder) => Promise<unknown>;
  createNote: (note: Note) => Promise<unknown>;
  syncBody: (id: string, update: string) => Promise<unknown>;
  isRetryable: (cause: unknown) => boolean;
}>()("migration/CloudApi") {}
export class BodyReader extends Context.Service<BodyReader, {
  read: (id: string) => Promise<string | null>;
}>()("migration/BodyReader") {}

export const networkSchedule = Schedule.exponential("250 millis").pipe(
  Schedule.modifyDelay(({ duration }) =>
    Effect.succeed(Duration.millis(Math.min(Duration.toMillis(duration), 2000)))),
);

const localStep = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: (cause) => new LocalStoreError({ operation, cause }) });

export const uploadLocalNotes = Effect.gen(function* () {
  const local = yield* LocalStore;
  const cloud = yield* CloudApi;
  const bodies = yield* BodyReader;
  const snapshot = yield* localStep("snapshot", local.snapshot);
  const network = <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      try: run,
      catch: (cause) => new CloudUploadError({ operation, cause, retryable: cloud.isRetryable(cause) }),
    }).pipe(Effect.retry({ schedule: networkSchedule, times: 4, while: (error) => error.retryable }));

  for (const folder of snapshot.folders) {
    const key = `folder:${folder.id}`;
    if (!(yield* localStep("read checkpoint", () => local.completed(key, JSON.stringify(folder))))) {
      yield* network(key, () => cloud.createFolder(folder));
      yield* localStep("checkpoint", () => local.checkpoint(key, JSON.stringify(folder)));
    }
  }
  yield* Effect.forEach(snapshot.notes, (note) => Effect.gen(function* () {
    const key = `note:${note.id}`;
    const body = yield* Effect.tryPromise({
      try: () => bodies.read(note.id),
      catch: (cause) => new BodyReadError({ id: note.id, cause }),
    });
    // A note edited after an interrupted upload must send its newer body too.
    const version = yield* Effect.tryPromise({
      try: async () => {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([note, body])));
        return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      },
      catch: (cause) => new BodyReadError({ id: note.id, cause }),
    });
    if (yield* localStep("read checkpoint", () => local.completed(key, version))) return;
    yield* network(key, () => cloud.createNote(note));
    if (body !== null) yield* network(`body:${note.id}`, () => cloud.syncBody(note.id, body));
    yield* localStep("checkpoint", () => local.checkpoint(key, version));
  }), { concurrency: 3, discard: true });
  yield* localStep("finish", () => local.finish(snapshot));
  return snapshot.notes.length;
});
