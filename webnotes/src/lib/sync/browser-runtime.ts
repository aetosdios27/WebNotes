import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import type * as Y from "yjs";
import { browserAckStore, browserTransport } from "./browser-services";
import { makeSyncEngine, type SyncStatus } from "./engine";

export function startNoteSync(options: {
  readonly id: string;
  readonly doc: Y.Doc;
  readonly userId: string;
  readonly onStatus: (status: SyncStatus) => void;
}) {
  const { id, doc, userId } = options;
  const program = Effect.scoped(Effect.gen(function*() {
    const engine = yield* makeSyncEngine({
      id, doc,
      pullTriggers: Stream.fromEventListener(window, "focus").pipe(
        Stream.merge(Stream.fromEventListener(window, "online")),
      ),
      onStatus: options.onStatus,
    });
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        window.addEventListener("pagehide", engine.beacon);
        window.addEventListener("beforeunload", engine.beacon);
      }),
      () => Effect.sync(() => {
        window.removeEventListener("pagehide", engine.beacon);
        window.removeEventListener("beforeunload", engine.beacon);
      }),
    );
    return yield* Effect.never;
  })).pipe(Effect.provide(Layer.merge(browserTransport, browserAckStore(userId))));
  const fiber = Effect.runFork(program);
  return () => Effect.runPromise(Fiber.interrupt(fiber)).then(() => undefined);
}
