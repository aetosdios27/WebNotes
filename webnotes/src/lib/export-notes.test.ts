import { afterAll, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { unzipSync, strFromU8 } from "fflate";
import { exportNotesZip } from "./export-notes";
import type { Note } from "./storage/types";

const dom = new JSDOM("<!doctype html>");
const previous = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  Node: globalThis.Node,
  HTMLElement: globalThis.HTMLElement,
};
Object.defineProperties(globalThis, {
  Node: { configurable: true, value: dom.window.Node },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
});
afterAll(() => {
  Object.entries(previous).forEach(([key, value]) =>
    Object.defineProperty(globalThis, key, { configurable: true, value }),
  );
  dom.window.close();
});
const note = (id: string, folderId: string | null): Note => ({
  id,
  title: "../Same: title",
  content: "<p>Hello <strong>world</strong></p>",
  folderId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("Markdown archive", () => {
  test("preserves notes with duplicate titles and folders without unsafe paths", async () => {
    const bytes = await exportNotesZip(
      [note("a", "folder-a"), note("b", "folder-b"), note("c", null)],
      [
        { id: "folder-a", name: "../Work", createdAt: new Date() },
        { id: "folder-b", name: "../Work", createdAt: new Date() },
      ],
    );
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toHaveLength(3);
    expect(
      Object.keys(files).every(
        (path) => !path.includes("../") && path.endsWith(".md"),
      ),
    ).toBe(true);
    expect(Object.values(files).map((bytes) => strFromU8(bytes))).toEqual(
      Array(3).fill("# ../Same: title\n\nHello **world**"),
    );
  });
  test("exports an empty collection as a valid empty ZIP", async () => {
    expect(Object.keys(unzipSync(await exportNotesZip([], [])))).toEqual([]);
  });
});
