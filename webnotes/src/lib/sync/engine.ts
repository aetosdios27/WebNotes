import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as Y from "yjs";
import { AckVectorStore, SyncTransport, type TransportError } from "./services";

const retrySchedule = Schedule.min([
  Schedule.exponential("500 millis").pipe(Schedule.jittered),
  Schedule.spaced("30 seconds"),
]);

export interface SyncStatus {
  readonly saving: boolean;
  readonly error: string | null;
  readonly pulled: boolean;
  readonly hasServerState: boolean;
}

// The caller owns the scope. Closing it interrupts network/debounce fibers,
// flushes one last snapshot, then releases every listener and queue.
export function makeSyncEngine(options: {
  readonly id: string;
  readonly doc: Y.Doc;
  readonly pullTriggers?: Stream.Stream<unknown>;
  readonly debounceMs?: number;
  readonly onStatus?: (status: SyncStatus) => void;
}) {
  return Effect.gen(function*() {
    const transport = yield* SyncTransport;
    const store = yield* AckVectorStore;
    const { id, doc } = options;
    let status: SyncStatus = { saving: false, error: null, pulled: false, hasServerState: false };
    const report = (patch: Partial<SyncStatus>) => {
      status = { ...status, ...patch };
      options.onStatus?.(status);
    };
    let ack = yield* store.load(id).pipe(Effect.catchTag("AckStoreError", error => {
      report({ error: error.message });
      return Effect.succeed(null);
    }));
    // Reconcile on every open, including deletion-only edits made while closed.
    let revision = 1;
    let acknowledgedRevision = 0;
    const updates = yield* Queue.make<void>({ capacity: 1, strategy: "sliding" });
    const lock = yield* Semaphore.make(1);
    const saveAck = (vector: Uint8Array) => Effect.gen(function*() {
      ack = vector;
      yield* store.save(id, vector).pipe(Effect.catchTag("AckStoreError", error =>
        Effect.sync(() => report({ error: error.message }))));
    });
    const push = lock.withPermit(Effect.gen(function*() {
      if (revision === acknowledgedRevision) return;
      const sentRevision = revision;
      const sentVector = Y.encodeStateVector(doc);
      const update = Y.encodeStateAsUpdate(doc, ack ?? undefined);
      report({ saving: true });
      yield* transport.push(id, update);
      // Never acknowledge edits made while the request was in flight.
      acknowledgedRevision = sentRevision;
      report({ saving: revision !== acknowledgedRevision, error: null });
      yield* saveAck(sentVector);
    }));
    const pull = lock.withPermit(Effect.gen(function*() {
      const result = yield* transport.pull(id, Y.encodeStateVector(doc));
      Y.applyUpdate(doc, result.update, "remote");
      report({ pulled: true, hasServerState: result.hasServerState, error: null });
      // This vector describes the server snapshot, never the unsent local state.
      yield* saveAck(result.serverVector);
    }));
    const recover = <A>(task: Effect.Effect<A, TransportError>) => task.pipe(
      Effect.tapError(error => Effect.sync(() => report({ error: error.message }))),
      Effect.retry({ schedule: retrySchedule, while: error => error.retryable }),
      Effect.catchTag("TransportError", () => Effect.sync(() => report({ saving: false }))),
    );
    const onUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      revision++;
      Queue.offerUnsafe(updates, undefined);
    };
    doc.on("update", onUpdate);
    Queue.offerUnsafe(updates, undefined);
    const pushFiber = yield* Stream.fromQueue(updates).pipe(
      Stream.debounce(options.debounceMs ?? 500),
      Stream.runForEach(() => recover(push)),
      Effect.forkScoped,
    );
    const pullFiber = yield* Stream.make(undefined).pipe(
      Stream.concat(options.pullTriggers ?? Stream.empty),
      // Coalesce focus/online bursts while a pull is running.
      Stream.debounce(0),
      Stream.runForEach(() => recover(pull)),
      Effect.forkScoped,
    );
    const beacon = () => {
      if (revision === acknowledgedRevision) return;
      try {
        transport.beacon(id, Y.encodeStateAsUpdate(doc, ack ?? undefined));
      } catch {
        // IndexedDB remains authoritative. A beacon is never an acknowledgement.
      }
    };
    yield* Effect.addFinalizer(() => Effect.gen(function*() {
      doc.off("update", onUpdate);
      yield* Fiber.interruptAll([pushFiber, pullFiber]);
      yield* push.pipe(
        Effect.interruptible,
        Effect.timeout("2 seconds"),
        Effect.catchTags({
          TransportError: () => Effect.sync(beacon),
          TimeoutError: () => Effect.sync(beacon),
        }),
      );
      yield* Queue.shutdown(updates);
      report({ saving: false });
    }));
    return { flush: push, pull, beacon };
  });
}
