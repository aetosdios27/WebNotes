// src/lib/effect/sync-queue.ts
import { Effect, Queue, Fiber, Schedule, pipe, Ref } from "effect";
import type { Note } from "@/lib/storage/types";
import { NetworkError } from "./errors";
import { trpcVanilla } from "@/lib/trpc/client";

// Types of operations that can be queued
type SyncOperation =
  | { type: "create"; note: Note }
  | { type: "update"; id: string; data: Partial<Note> }
  | { type: "delete"; id: string }
  | { type: "snapshot"; noteId: string }; // <-- Added

// The sync queue state
interface SyncQueueState {
  queue: Queue.Queue<SyncOperation>;
  processing: Ref.Ref<boolean>;
  fiber: Fiber.Fiber<never, never> | null;
}

// Process a single operation
const processOperation = (op: SyncOperation) =>
  pipe(
    Effect.gen(function* (_) {
      switch (op.type) {
        case "create":
          yield* _(
            Effect.tryPromise({
              try: () =>
                trpcVanilla.notes.create.mutate({
                  title: op.note.title ?? "",
                  content: op.note.content ?? "",
                  folderId: op.note.folderId,
                }),
              catch: (e) => new NetworkError("Failed to create note", e),
            })
          );
          break;

        case "update":
          yield* _(
            Effect.tryPromise({
              try: () =>
                trpcVanilla.notes.update.mutate({
                  id: op.id,
                  htmlContent: op.data.content,
                  textContent: op.data.title,
                  folderId: op.data.folderId,
                  isPinned: op.data.isPinned,
                  pinnedAt: op.data.pinnedAt,
                }),
              catch: (e) => new NetworkError("Failed to update note", e),
            })
          );
          break;

        case "delete":
          yield* _(
            Effect.tryPromise({
              try: () => trpcVanilla.notes.delete.mutate({ id: op.id }),
              catch: (e) => new NetworkError("Failed to delete note", e),
            })
          );
          break;

        case "snapshot":
          yield* _(
            Effect.tryPromise({
              try: () =>
                trpcVanilla.versions.snapshot.mutate({ noteId: op.noteId }),
              catch: (e) => new NetworkError("Failed to snapshot note", e),
            })
          );
          break;
      }
    }),
    // Retry with exponential backoff: 1s, 2s, 4s, 8s, max 30s
    Effect.retry(
      Schedule.exponential("1 second").pipe(
        Schedule.union(Schedule.spaced("30 seconds")),
        Schedule.compose(Schedule.recurs(5))
      )
    ),
    // Log failures but don't crash the queue
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error("[SyncQueue] Operation failed after retries:", error);
      })
    )
  );

// Create the sync queue
export const createSyncQueue = Effect.gen(function* (_) {
  const queue = yield* _(Queue.unbounded<SyncOperation>());
  const processing = yield* _(Ref.make(false));

  // Background processor
  const processor = pipe(
    Effect.gen(function* (_) {
      while (true) {
        // Wait for next operation
        const op = yield* _(Queue.take(queue));

        // Mark as processing
        yield* _(Ref.set(processing, true));

        // Process it
        yield* _(processOperation(op));

        // Mark as done
        yield* _(Ref.set(processing, false));
      }
    }),
    Effect.forever
  );

  // Start the processor in background
  const fiber = yield* _(Effect.fork(processor));

  return {
    queue,
    processing,
    fiber,
  };
});

// Helpers to enqueue operations
export const enqueueCreate = (state: SyncQueueState, note: Note) =>
  Queue.offer(state.queue, { type: "create", note });

export const enqueueUpdate = (
  state: SyncQueueState,
  id: string,
  data: Partial<Note>
) => Queue.offer(state.queue, { type: "update", id, data });

export const enqueueDelete = (state: SyncQueueState, id: string) =>
  Queue.offer(state.queue, { type: "delete", id });

export const enqueueSnapshot = (state: SyncQueueState, noteId: string) =>
  Queue.offer(state.queue, { type: "snapshot", noteId });

// Check status
export const isQueueEmpty = (state: SyncQueueState) =>
  Queue.size(state.queue).pipe(Effect.map((size) => size === 0));

export const isProcessing = (state: SyncQueueState) =>
  Ref.get(state.processing);
