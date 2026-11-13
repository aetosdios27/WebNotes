import type { Note } from "./storage/types";

export async function noteMarkdown(note: Note): Promise<string> {
  const [
    { Editor },
    { default: StarterKit },
    { Markdown },
    { TaskList },
    { TaskItem },
    { Table },
    { TableRow },
    { TableHeader },
    { TableCell },
  ] = await Promise.all([
    import("@tiptap/core"),
    import("@tiptap/starter-kit"),
    import("tiptap-markdown"),
    import("@tiptap/extension-task-list"),
    import("@tiptap/extension-task-item"),
    import("@tiptap/extension-table"),
    import("@tiptap/extension-table-row"),
    import("@tiptap/extension-table-header"),
    import("@tiptap/extension-table-cell"),
  ]);
  const editor = new Editor({
    extensions: [
      StarterKit,
      Markdown,
      TaskList,
      TaskItem,
      Table,
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: note.content || "",
  });
  try {
    return `# ${note.title || "Untitled"}\n\n${editor.storage.markdown.getMarkdown()}`;
  } finally {
    editor.destroy();
  }
}
