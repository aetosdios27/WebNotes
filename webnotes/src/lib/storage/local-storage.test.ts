import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LocalStorageAdapter } from "./local-storage";

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});
afterEach(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

describe("local note creation", () => {
  test("a first-run blank note stays blank when loaded again", async () => {
    const storage = new LocalStorageAdapter();
    const created = await storage.createNote({ title: "", content: "" });
    const [reloaded] = await new LocalStorageAdapter().getNotes();
    expect(reloaded.id).toBe(created.id);
    expect(reloaded.title).toBe("");
    expect(reloaded.content).toBe("");
  });

  test("omitting the title keeps the existing Untitled default", async () => {
    const note = await new LocalStorageAdapter().createNote({});
    expect(note.title).toBe("Untitled");
  });
});
