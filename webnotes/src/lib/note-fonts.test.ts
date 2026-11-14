import { expect, test } from "bun:test";
import { defaultNoteFont } from "./note-fonts";
import { LocalStorageAdapter } from "./storage/local-storage";

test("older or invalid settings safely default to sans", () => {
  for (const value of [undefined, null, "comic", {}, 0])
    expect(defaultNoteFont(value)).toBe("sans");
  expect(defaultNoteFont("mono")).toBe("mono");
  expect(defaultNoteFont("serif")).toBe("serif");
});

test("a writing default survives a fresh storage adapter", async () => {
  const previous = globalThis.localStorage;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    await new LocalStorageAdapter().updateSettings({ defaultFont: "serif" });
    const adapter = new LocalStorageAdapter();
    const settings = await adapter.getSettings();
    expect(settings.defaultFont).toBe("serif");
    await adapter.createNote({
      title: "A serif note",
      font: defaultNoteFont(settings.defaultFont),
    });
    expect((await new LocalStorageAdapter().getNotes())[0]?.font).toBe("serif");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previous,
    });
  }
});
