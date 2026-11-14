import { describe, expect, test } from "bun:test";
import { isNoteEmpty } from "./note-empty";

describe("isNoteEmpty", () => {
  const blank = { type: "doc", content: [{ type: "paragraph", attrs: { id: "block" } }] };
  test("empty paragraphs count as empty", () => {
    expect(isNoteEmpty("", blank)).toBe(true);
    expect(isNoteEmpty("", { type: "doc" })).toBe(true);
  });
  test("any title or text, including whitespace, is retained", () => {
    expect(isNoteEmpty("Title", blank)).toBe(false);
    expect(isNoteEmpty(" ", blank)).toBe(false);
    for (const text of ["hello", " "]) {
      expect(isNoteEmpty("", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] })).toBe(false);
    }
  });
  test("non-text content and deliberate structure are retained", () => {
    for (const type of ["image", "horizontalRule", "mathBlock", "table", "codeBlock", "taskList", "heading"]) {
      expect(isNoteEmpty("", { type: "doc", content: [{ type }] })).toBe(false);
    }
    expect(isNoteEmpty("", { type: "doc", content: [{ type: "paragraph", content: [{ type: "hardBreak" }] }] })).toBe(false);
  });
});
