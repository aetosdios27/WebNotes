import type { JSONContent } from "@tiptap/core";

// Only blank prose paragraphs are disposable. Keep structural content (including
// empty tables, code, tasks, images and math) even when it has no text.
export function isNoteEmpty(title: string, doc: JSONContent): boolean {
  return title.length === 0 && doc.type === "doc" &&
    (doc.content ?? []).every(node => node.type === "paragraph" &&
      (node.content ?? []).length === 0);
}
