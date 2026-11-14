import { expect, test } from "bun:test";
import {
  contentInput,
  folderNameInput,
  fontInput,
  idInput,
  titleInput,
  MAX_CONTENT_LENGTH,
} from "./input-limits";
import { NOTE_FONT_IDS } from "./note-fonts";
import { readBeaconInput, MAX_BEACON_BYTES } from "./sync/beacon-input";
import {
  decodeClientUpdate,
  MAX_UPDATE_BASE64_LENGTH,
  updateInput,
} from "./sync/update-input";

test("accepts boundaries and rejects strings one character over", () => {
  for (const [schema, limit] of [
    [idInput, 64],
    [titleInput, 200],
    [folderNameInput, 60],
    [contentInput, MAX_CONTENT_LENGTH],
    [updateInput, MAX_UPDATE_BASE64_LENGTH],
  ] as const) {
    expect(schema.safeParse("x".repeat(limit)).success).toBe(true);
    expect(schema.safeParse("x".repeat(limit + 1)).success).toBe(false);
  }
});
test("folder names are trimmed and cannot be blank", () => {
  expect(folderNameInput.parse("  Projects  ")).toBe("Projects");
  expect(folderNameInput.safeParse("   ").success).toBe(false);
});
test("fonts come from shipped editor choices", () => {
  for (const font of NOTE_FONT_IDS) expect(fontInput.parse(font)).toBe(font);
  expect(fontInput.safeParse("invented-font").success).toBe(false);
});
test("rejects oversized encoded updates before base64 decoding", () => {
  expect(() =>
    decodeClientUpdate(" ".repeat(MAX_UPDATE_BASE64_LENGTH + 1)),
  ).toThrow("1 MB limit");
});
test("beacon validates ids, updates and malformed JSON", async () => {
  const request = (body: string) =>
    new Request("http://localhost", { method: "POST", body });
  await expect(
    readBeaconInput(request(JSON.stringify({ id: "n", update: "AAA=" }))),
  ).resolves.toEqual({ id: "n", update: "AAA=" });
  for (const body of [
    "{",
    JSON.stringify({ id: "x".repeat(65), update: "AAA=" }),
    JSON.stringify({
      id: "n",
      update: "x".repeat(MAX_UPDATE_BASE64_LENGTH + 1),
    }),
  ]) {
    await expect(readBeaconInput(request(body))).rejects.toThrow(
      "Invalid sync body",
    );
  }
  await expect(
    readBeaconInput(request(" ".repeat(MAX_BEACON_BYTES + 1))),
  ).rejects.toThrow("exceeds the limit");
});
test("beacon bounds streamed bodies without trusting Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(65536));
    },
    cancel() {
      cancelled = true;
    },
  });
  const init = { method: "POST", body: stream, duplex: "half" };
  const request = new Request("http://localhost", init);
  await expect(readBeaconInput(request)).rejects.toThrow("exceeds the limit");
  expect(cancelled).toBe(true);
});
