import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as Deferred from "effect/Deferred";
import * as Fiber from "effect/Fiber";
import * as Scope from "effect/Scope";
import * as Exit from "effect/Exit";
import { TestClock } from "effect/testing";
import * as Y from "yjs";
import { makeSyncEngine } from "./engine";
import { AckVectorStore, SyncTransport, TransportError } from "./services";

function fixture() {
  const server = new Y.Doc();
  const pushes: Uint8Array[] = [];
  const beacons: Uint8Array[] = [];
  const vectors = new Map<string, Uint8Array>();
  let offline = false;
  let attempts = 0;
  const transport = Layer.succeed(SyncTransport, {
    push: (_id, bytes) => Effect.suspend(() => {
      attempts++;
      if (offline) return Effect.fail(new TransportError({ message: "offline", retryable: true }));
      pushes.push(bytes);
      Y.applyUpdate(server, bytes);
      return Effect.void;
    }),
    pull: (_id, vector) => Effect.suspend(() => offline
      ? Effect.fail(new TransportError({ message: "offline", retryable: true }))
      : Effect.succeed({ update: Y.encodeStateAsUpdate(server, vector), serverVector: Y.encodeStateVector(server), hasServerState: true })),
    beacon: (_id, bytes) => { beacons.push(bytes); },
  });
  const store = Layer.succeed(AckVectorStore, {
    load: id => Effect.sync(() => vectors.get(id) ?? null),
    save: (id, vector) => Effect.sync(() => { vectors.set(id, vector); }),
  });
  return {
    server, pushes, vectors, beacons,
    get attempts() { return attempts; },
    setOffline: (value: boolean) => { offline = value; },
    layer: Layer.merge(transport, store),
  };
}

const advance = (ms = 1000) => TestClock.adjust(ms);
// The first push waits for the first pull, so opening needs two clock steps.
const settle = Effect.andThen(advance(), advance());
function run<A, E, R>(program: Effect.Effect<A, E, R>, layer: Layer.Layer<R>) {
  return Effect.runPromise(program.pipe(Effect.provide(layer), Effect.provide(TestClock.layer())));
}

describe("note sync engine", () => {
  test("coalesces two rapid edits into one push containing both", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const doc = new Y.Doc();
      yield* makeSyncEngine({ id: "a", doc });
      doc.getText("body").insert(0, "first");
      yield* advance(200);
      doc.getText("body").insert(5, " second");
      yield* advance(499);
      expect(f.pushes).toHaveLength(0);
      yield* advance(1);
      expect(f.pushes).toHaveLength(1);
      expect(f.server.getText("body").toString()).toBe("first second");
    })), f.layer);
  });

  test("pushes only the unacknowledged diff and persists its vector across opens", async () => {
    const f = fixture();
    const doc = new Y.Doc();
    doc.getText("body").insert(0, "x".repeat(100_000));
    await run(Effect.scoped(Effect.gen(function*() {
      yield* makeSyncEngine({ id: "a", doc });
      yield* settle;
      expect(f.pushes).toHaveLength(1);
      doc.getText("body").insert(50_000, "small edit");
      yield* advance();
      expect(f.pushes).toHaveLength(2);
      expect(f.pushes[1].byteLength).toBeLessThan(Y.encodeStateAsUpdate(doc).byteLength / 100);
    })), f.layer);
    expect(f.vectors.has("a")).toBe(true);
    await run(Effect.scoped(Effect.gen(function*() {
      doc.getText("body").insert(0, "reload");
      yield* makeSyncEngine({ id: "a", doc });
      yield* settle;
      expect(f.pushes.at(-1)!.byteLength).toBeLessThan(100);
      expect(f.server.getText("body").toString()).toBe(doc.getText("body").toString());
    })), f.layer);
  });

  test("retries offline pushes and includes edits made during backoff", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const doc = new Y.Doc();
      yield* makeSyncEngine({ id: "a", doc });
      yield* advance();
      f.setOffline(true);
      doc.getText("body").insert(0, "offline");
      yield* advance(3000);
      expect(f.attempts).toBeGreaterThan(2);
      expect(f.server.getText("body").toString()).toBe("");
      doc.getText("body").insert(7, " and more");
      f.setOffline(false);
      yield* advance(30_000);
      expect(f.server.getText("body").toString()).toBe("offline and more");
    })), f.layer);
  });

  test("two clients converge after push and a pull trigger, without echoing remote updates", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const a = new Y.Doc();
      const b = new Y.Doc();
      const triggers = yield* Queue.unbounded<void>();
      const secondDeviceStore = Layer.succeed(AckVectorStore, {
        load: () => Effect.succeed(null),
        save: () => Effect.void,
      });
      const first = yield* makeSyncEngine({ id: "note", doc: a });
      yield* makeSyncEngine({ id: "note", doc: b, pullTriggers: Stream.fromQueue(triggers) }).pipe(
        Effect.provide(secondDeviceStore),
      );
      yield* advance();
      a.getText("body").insert(0, "from A");
      b.getText("body").insert(0, "from B");
      yield* advance();
      const count = f.pushes.length;
      yield* Queue.offer(triggers, undefined);
      yield* advance();
      yield* first.pull;
      expect(b.getText("body").toString()).toBe(f.server.getText("body").toString());
      expect(a.getText("body").toString()).toBe(b.getText("body").toString());
      expect(f.pushes).toHaveLength(count);
    })), f.layer);
  });

  test("closing flushes a pending push before debounce and removes listeners", async () => {
    const f = fixture();
    const doc = new Y.Doc();
    await run(Effect.scoped(Effect.gen(function*() {
      yield* makeSyncEngine({ id: "a", doc });
      yield* settle;
      doc.getText("body").insert(0, "close immediately");
    })), f.layer);
    expect(f.server.getText("body").toString()).toBe("close immediately");
    const sent = f.pushes.length;
    doc.getText("body").insert(0, "after close");
    expect(f.pushes).toHaveLength(sent);
  });

  test("an edit closed before the first pull stays local and is sent on the next open", async () => {
    const f = fixture();
    const doc = new Y.Doc();
    await run(Effect.scoped(Effect.gen(function*() {
      yield* makeSyncEngine({ id: "a", doc });
      doc.getText("body").insert(0, "quick edit");
    })), f.layer);
    expect(f.pushes).toHaveLength(0);
    await run(Effect.scoped(Effect.gen(function*() {
      yield* makeSyncEngine({ id: "a", doc });
      yield* settle;
    })), f.layer);
    expect(f.server.getText("body").toString()).toBe("quick edit");
  });

  test("edits made during an in-flight push are not acknowledged until sent", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const doc = new Y.Doc();
      const gate = yield* Deferred.make<void>();
      const started = yield* Deferred.make<void>();
      let block = false;
      const base = yield* SyncTransport;
      const transport = Layer.succeed(SyncTransport, {
        ...base,
        push: (id, bytes) => Effect.gen(function*() {
          if (block) { yield* Deferred.succeed(started, undefined); yield* Deferred.await(gate); }
          yield* base.push(id, bytes);
        }),
      });
      const engine = yield* makeSyncEngine({ id: "a", doc }).pipe(Effect.provide(transport));
      yield* advance();
      block = true;
      doc.getText("body").insert(0, "one");
      const pushing = yield* engine.flush.pipe(Effect.forkChild);
      yield* Deferred.await(started);
      doc.getText("body").insert(3, "two");
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(pushing);
      yield* advance();
      expect(f.server.getText("body").toString()).toBe("onetwo");
    })), f.layer);
  });

  test("pulling before a pending push never acknowledges unsent local edits", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const doc = new Y.Doc();
      const engine = yield* makeSyncEngine({ id: "a", doc });
      yield* advance();
      doc.getText("body").insert(0, "not on server yet");
      yield* engine.pull;
      expect(f.vectors.get("a")).not.toEqual(Y.encodeStateVector(doc));
      yield* advance();
      expect(f.server.getText("body").toString()).toBe("not on server yet");
    })), f.layer);
  });

  test("deletions sync even though they do not change the state vector", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const doc = new Y.Doc();
      doc.getText("body").insert(0, "delete me");
      yield* makeSyncEngine({ id: "a", doc });
      yield* advance();
      const before = Y.encodeStateVector(doc);
      doc.getText("body").delete(0, 9);
      expect(Y.encodeStateVector(doc)).toEqual(before);
      yield* advance();
      expect(f.server.getText("body").toString()).toBe("");
    })), f.layer);
  });

  test("shutdown times out a stalled flush, beacons, and stops retrying", async () => {
    const f = fixture();
    await run(Effect.scoped(Effect.gen(function*() {
      const scope = yield* Scope.make();
      const base = yield* SyncTransport;
      let requests = 0;
      const transport = Layer.succeed(SyncTransport, {
        ...base,
        push: () => { requests++; return Effect.never; },
      });
      const doc = new Y.Doc();
      yield* makeSyncEngine({ id: "a", doc }).pipe(
        Effect.provideService(Scope.Scope, scope), Effect.provide(transport),
      );
      doc.getText("body").insert(0, "still local");
      yield* advance();
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild);
      yield* advance(2000);
      yield* Fiber.join(closing);
      expect(f.beacons).toHaveLength(1);
      const count = requests;
      yield* advance(60_000);
      expect(requests).toBe(count);
    })), f.layer);
  });

  test("a failed close uses a binary beacon without advancing its acknowledgement", async () => {
    const f = fixture();
    const doc = new Y.Doc();
    await run(Effect.scoped(Effect.gen(function*() {
      yield* makeSyncEngine({ id: "a", doc });
      yield* advance();
      f.setOffline(true);
      doc.getText("body").insert(0, "durable locally");
    })), f.layer);
    expect(f.beacons).toHaveLength(1);
    expect(f.vectors.get("a")).not.toEqual(Y.encodeStateVector(doc));
    Y.applyUpdate(f.server, f.beacons[0]);
    expect(f.server.getText("body").toString()).toBe("durable locally");
  });

  test("never publishes an unreconciled placeholder when closed during the first pull", async () => {
    const pushes: Uint8Array[] = [];
    const beacons: Uint8Array[] = [];
    const pullStarted = Effect.runSync(Deferred.make<void>());
    const layer = Layer.merge(
      Layer.succeed(SyncTransport, {
        push: (_id, bytes) => Effect.sync(() => { pushes.push(bytes); }),
        pull: () => Deferred.succeed(pullStarted, undefined).pipe(Effect.andThen(Effect.never)),
        beacon: (_id, bytes) => { beacons.push(bytes); },
      }),
      Layer.succeed(AckVectorStore, {
        load: () => Effect.succeed(null),
        save: () => Effect.void,
      }),
    );
    await run(Effect.gen(function*() {
      const doc = new Y.Doc();
      const scope = yield* Scope.make();
      const engine = yield* makeSyncEngine({ id: "legacy", doc }).pipe(Scope.provide(scope));
      yield* Deferred.await(pullStarted);
      doc.getXmlFragment("default").insert(0, [new Y.XmlElement("paragraph")]);
      yield* advance(5_000);
      engine.beacon();
      yield* Scope.close(scope, Exit.void);
    }), layer);
    expect(pushes).toHaveLength(0);
    expect(beacons).toHaveLength(0);
  });
});
