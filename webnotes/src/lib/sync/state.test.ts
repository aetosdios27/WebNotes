import { describe, expect, test } from "bun:test";
import * as Y from "yjs";
import { encodeDiff, mergeState } from "./state";
import { makeUpdate, values } from "./testing/updates";

describe("Yjs state", () => {
  test("merges updates in either order with an existing snapshot", () => {
    const snapshot = makeUpdate("existing", "snapshot");
    const first = makeUpdate("first", "one");
    const second = makeUpdate("second", "two");
    const forward = mergeState(snapshot, [first, second]);
    const reverse = mergeState(snapshot, [second, first]);

    expect(forward).toEqual(reverse);
    expect(values(forward)).toEqual({ existing: "snapshot", first: "one", second: "two" });
  });

  test("encodes a diff that brings a client up to date", () => {
    const snapshot = makeUpdate("first", "one");
    const state = mergeState(snapshot, [makeUpdate("second", "two")]);
    const client = new Y.Doc();
    try {
      Y.applyUpdate(client, snapshot);
      const diff = encodeDiff(state, Y.encodeStateVector(client));
      Y.applyUpdate(client, diff);
      expect(client.getMap("values").toJSON()).toEqual(values(state));
      Y.applyUpdate(client, diff);
      expect(client.getMap("values").toJSON()).toEqual(values(state));
    } finally {
      client.destroy();
    }
  });

  test("preserves pending updates until their dependencies arrive", () => {
    const source = new Y.Doc();
    const client = new Y.Doc();
    try {
      source.getText("text").insert(0, "first");
      const first = Y.encodeStateAsUpdate(source);
      const vector = Y.encodeStateVector(source);
      source.getText("text").insert(5, " second");
      const second = Y.encodeStateAsUpdate(source, vector);
      const pendingSnapshot = mergeState(null, [second]);
      const state = mergeState(pendingSnapshot, [first]);
      Y.applyUpdate(client, state);
      expect(client.getText("text").toString()).toBe("first second");
    } finally {
      source.destroy();
      client.destroy();
    }
  });

  test("includes deletions in the state-vector diff", () => {
    const source = new Y.Doc();
    const client = new Y.Doc();
    try {
      source.getText("text").insert(0, "keep remove");
      Y.applyUpdate(client, Y.encodeStateAsUpdate(source));
      source.getText("text").delete(4, 7);
      const state = mergeState(Y.encodeStateAsUpdate(source), []);
      Y.applyUpdate(client, encodeDiff(state, Y.encodeStateVector(client)));
      expect(client.getText("text").toString()).toBe("keep");
    } finally {
      source.destroy();
      client.destroy();
    }
  });

  test("merges an empty note into a valid empty state", () => {
    expect(values(mergeState(null, []))).toEqual({});
  });

  test("drops deleted content, so repeated full replacements stay small", () => {
    const doc = new Y.Doc();
    const saves: Uint8Array[] = [];
    try {
      const text = doc.getText("text");
      for (let i = 0; i < 8; i++) {
        text.delete(0, text.length);
        text.insert(0, String(i).repeat(50_000));
        saves.push(Y.encodeStateAsUpdate(doc));
      }
    } finally {
      doc.destroy();
    }
    const merged = mergeState(null, saves);
    expect(merged.byteLength).toBeLessThan(2 * 50_000);
    const check = new Y.Doc();
    try {
      Y.applyUpdate(check, merged);
      expect(check.getText("text").toString()).toBe("7".repeat(50_000));
    } finally {
      check.destroy();
    }
  });
});
