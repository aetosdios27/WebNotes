import { describe, expect, test } from "bun:test";
import {
  notePath,
  noteIdFromPath,
  wallPath,
  wallFilterFromSearch,
  noteDocumentTitle,
} from "./note-url";

describe("notePath", () => {
  test("wraps any id in the /n/ prefix", () => {
    expect(notePath("abc-123")).toBe("/n/abc-123");
    expect(notePath("")).toBe("/n/");
  });
  test("encodes ids that contain URL metacharacters", () => {
    expect(notePath("a/b c")).toBe("/n/a%2Fb%20c");
  });
});

describe("noteIdFromPath", () => {
  test("returns the id for a note URL, with or without a trailing slash", () => {
    expect(noteIdFromPath("/n/abc-123")).toBe("abc-123");
    expect(noteIdFromPath("/n/abc-123/")).toBe("abc-123");
  });
  test("decodes encoded ids", () => {
    expect(noteIdFromPath("/n/a%2Fb%20c")).toBe("a/b c");
  });
  test("returns null for home, settings and unrelated paths", () => {
    expect(noteIdFromPath("/")).toBe(null);
    expect(noteIdFromPath("/settings/account")).toBe(null);
    expect(noteIdFromPath("/signin")).toBe(null);
    expect(noteIdFromPath("/n")).toBe(null);
    expect(noteIdFromPath("/n/")).toBe(null);
    expect(noteIdFromPath("/n/a/b")).toBe(null);
  });
  test("returns null for a malformed escape", () => {
    expect(noteIdFromPath("/n/%E0%A4%A")).toBe(null);
  });
});

describe("wallPath", () => {
  test("home is bare /", () => {
    expect(wallPath("all")).toBe("/");
    expect(wallPath("")).toBe("/");
    expect(wallPath("anything-else")).not.toBe("/");
  });
  test("pinned uses the flag", () => {
    expect(wallPath("pinned")).toBe("/?pinned");
  });
  test("a folder id becomes a folder param", () => {
    expect(wallPath("folder-9")).toBe("/?folder=folder-9");
    expect(wallPath("a/b c")).toBe("/?folder=a%2Fb%20c");
  });
});

describe("wallFilterFromSearch", () => {
  test("parses home", () => {
    expect(wallFilterFromSearch("")).toBe("all");
    expect(wallFilterFromSearch("?")).toBe("all");
    expect(wallFilterFromSearch("?folder=")).toBe("all");
  });
  test("parses pinned", () => {
    expect(wallFilterFromSearch("?pinned")).toBe("pinned");
    expect(wallFilterFromSearch("?pinned=1")).toBe("pinned");
  });
  test("parses a folder and decodes it", () => {
    expect(wallFilterFromSearch("?folder=folder-9")).toBe("folder-9");
    expect(wallFilterFromSearch("?folder=a%2Fb%20c")).toBe("a/b c");
  });
  test("decodes once, so an id containing % round-trips", () => {
    expect(wallFilterFromSearch(wallPath("50%").slice(1))).toBe("50%");
    expect(() => wallFilterFromSearch("?folder=%E0%A4%A")).not.toThrow();
  });
});

describe("noteDocumentTitle", () => {
  test("uses Untitled for a blank title", () => {
    expect(noteDocumentTitle("")).toBe("Untitled · WebNotes");
    expect(noteDocumentTitle(null)).toBe("Untitled · WebNotes");
    expect(noteDocumentTitle(undefined)).toBe("Untitled · WebNotes");
  });
  test("uses the title otherwise", () => {
    expect(noteDocumentTitle("Groceries")).toBe("Groceries · WebNotes");
  });
});
