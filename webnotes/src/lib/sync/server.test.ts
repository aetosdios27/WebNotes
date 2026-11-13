import { describe, expect, test } from "bun:test";
import * as Y from "yjs";
import { createBinarySyncHandlers } from "./server";
import { createUpdateLog, COMPACT_AFTER_ROWS } from "./update-log";
import { MemoryDatabase } from "./testing/memory-database";
import { fromBase64Url, toBase64Url } from "./encoding";
import { MAX_UPDATE_BYTES } from "./update-input";

function fixture() {
  const db = new MemoryDatabase();
  let userId: string | undefined = "owner";
  let touches = 0;
  const handlers = createBinarySyncHandlers({
    session: async () => userId ? { user: { id: userId } } : null,
    ownsNote: async (id, user) => id === "note" && user === "owner",
    log: createUpdateLog(db),
    touch: async () => { touches++; },
  });
  return { db, handlers, setUser: (user: string | undefined) => { userId = user; }, get touches() { return touches; } };
}
const context = { params: Promise.resolve({ id: "note" }) };
const post = (bytes: Uint8Array, headers: Record<string, string> = {}) => new Request("http://localhost/api/notes/note/sync", {
  method: "POST", body: new Uint8Array(bytes), headers: { "Content-Type": "application/octet-stream", ...headers },
});
const get = (vector: Uint8Array) => new Request(`http://localhost/api/notes/note/sync?sv=${toBase64Url(vector)}`);

describe("binary sync handlers", () => {
  test("both methods require a session and verify note ownership before accessing the log", async () => {
    const f = fixture();
    const request = post(new Uint8Array([0, 0]));
    const read = get(new Uint8Array([0]));
    f.setUser(undefined);
    expect((await f.handlers.POST(request, context)).status).toBe(401);
    expect((await f.handlers.GET(read, context)).status).toBe(401);
    f.setUser("someone else");
    expect((await f.handlers.POST(request, context)).status).toBe(404);
    expect((await f.handlers.GET(read, context)).status).toBe(404);
    expect(f.db.rows).toHaveLength(0);
    expect(f.touches).toBe(0);
  });

  test("validates the update and media type, and enforces the 1 MB limit without Content-Length", async () => {
    const f = fixture();
    expect((await f.handlers.POST(post(new Uint8Array([255])), context)).status).toBe(400);
    expect((await f.handlers.POST(post(new Uint8Array([0, 0]), { "Content-Type": "application/json" }), context)).status).toBe(415);
    expect((await f.handlers.POST(post(new Uint8Array(MAX_UPDATE_BYTES + 1)), context)).status).toBe(413);
    expect((await f.handlers.POST(post(new Uint8Array([0, 0]), { "Content-Length": String(MAX_UPDATE_BYTES + 1) }), context)).status).toBe(413);
    expect(f.db.rows).toHaveLength(0);
    const doc = new Y.Doc();
    // Measure the encoding overhead to construct an update exactly at the limit.
    doc.clientID = 1;
    doc.getText("t").insert(0, "x".repeat(MAX_UPDATE_BYTES - 16));
    const overhead = Y.encodeStateAsUpdate(doc).byteLength - (MAX_UPDATE_BYTES - 16);
    doc.destroy();
    const boundary = new Y.Doc();
    boundary.clientID = 1;
    boundary.getText("t").insert(0, "x".repeat(MAX_UPDATE_BYTES - overhead));
    const bytes = Y.encodeStateAsUpdate(boundary);
    expect(bytes.byteLength).toBe(MAX_UPDATE_BYTES);
    expect((await f.handlers.POST(post(bytes), context)).status).toBe(204);
    expect(f.db.rows).toHaveLength(1);
    boundary.destroy();
  });

  test("pull returns only the missing state, includes deletions, and disables caching", async () => {
    const f = fixture();
    const server = new Y.Doc();
    server.getText("body").insert(0, "x".repeat(50_000));
    const first = Y.encodeStateAsUpdate(server);
    const client = new Y.Doc();
    Y.applyUpdate(client, first);
    expect((await f.handlers.POST(post(first), context)).status).toBe(204);
    server.getText("body").insert(0, "new");
    server.getText("body").delete(10, 5);
    expect((await f.handlers.POST(post(Y.encodeStateAsUpdate(server, Y.encodeStateVector(client))), context)).status).toBe(204);
    const response = await f.handlers.GET(get(Y.encodeStateVector(client)), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fromBase64Url(response.headers.get("x-yjs-state-vector")!)).toEqual(new Uint8Array(Y.encodeStateVector(server)));
    const diff = new Uint8Array(await response.arrayBuffer());
    expect(diff.byteLength).toBeLessThan(first.byteLength / 100);
    Y.applyUpdate(client, diff);
    expect(client.getText("body").toString()).toBe(server.getText("body").toString());
    expect(f.touches).toBe(2);
  });

  test("rejects malformed vectors and missing ids with 400", async () => {
    const f = fixture();
    for (const query of ["", "?sv=!!!", "?sv=_w", "?sv="]) {
      const response = await f.handlers.GET(new Request(`http://localhost/sync${query}`), context);
      expect(response.status).toBe(400);
    }
    expect((await f.handlers.GET(get(new Uint8Array([0])), { params: Promise.resolve({ id: "" }) })).status).toBe(400);
  });

  test("an empty note returns a valid empty diff", async () => {
    const f = fixture();
    const response = await f.handlers.GET(get(new Uint8Array([0])), context);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0, 0]));
  });

  test("appends trigger compaction after the threshold", async () => {
    const f = fixture();
    const doc = new Y.Doc();
    doc.getText("body").insert(0, "kept");
    for (let i = 0; i <= COMPACT_AFTER_ROWS; i++) {
      expect((await f.handlers.POST(post(Y.encodeStateAsUpdate(doc)), context)).status).toBe(204);
    }
    expect(f.db.rows).toHaveLength(0);
    expect(f.db.snapshots.get("note")?.version).toBe(1);
    const read = await f.handlers.GET(get(new Uint8Array([0])), context);
    const restored = new Y.Doc();
    Y.applyUpdate(restored, new Uint8Array(await read.arrayBuffer()));
    expect(restored.getText("body").toString()).toBe("kept");
  });
});
