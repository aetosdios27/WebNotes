import { describe, expect, spyOn, test } from "bun:test";
import { decodeClientUpdate, MAX_UPDATE_BYTES } from "./update-input";
import { makeUpdate } from "./testing/updates";

describe("client update validation", () => {
  test("decodes valid base64 updates", () => {
    const bytes = makeUpdate("first", "one");
    expect(decodeClientUpdate(Buffer.from(bytes).toString("base64"))).toEqual(bytes);
  });

  test("accepts a valid update exactly 1 MB long", () => {
    const oversized = makeUpdate("data", "x".repeat(MAX_UPDATE_BYTES), 1);
    const overhead = oversized.byteLength - MAX_UPDATE_BYTES;
    const bytes = makeUpdate("data", "x".repeat(MAX_UPDATE_BYTES - overhead), 1);
    expect(bytes.byteLength).toBe(MAX_UPDATE_BYTES);
    expect(decodeClientUpdate(Buffer.from(bytes).toString("base64"))).toEqual(bytes);
  });

  test("rejects updates larger than 1 MB with a clear error", () => {
    const update = Buffer.alloc(MAX_UPDATE_BYTES + 1).toString("base64");
    expect(() => decodeClientUpdate(update)).toThrow("Yjs update exceeds the 1 MB limit");
  });

  test("rejects malformed Yjs data", () => {
    const errors = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => decodeClientUpdate("invalid")).toThrow("Invalid Yjs update");
      expect(() => decodeClientUpdate("")).toThrow("Invalid Yjs update");
    } finally {
      errors.mockRestore();
    }
  });
});
