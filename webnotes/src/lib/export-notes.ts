import { strToU8, zip } from "fflate";
import { noteMarkdown } from "./note-markdown";
import type { Folder, Note } from "./storage/types";

function filename(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
      .replace(/^\.+|[. ]+$/g, "")
      .trim()
      .slice(0, 100) || "Untitled"
  );
}

/** Stable id suffixes prevent duplicate titles or folder names from losing notes. */
export async function exportNotesZip(notes: Note[], folders: Folder[]) {
  const files: Record<string, Uint8Array> = Object.create(null);
  for (const note of notes) {
    const folder = folders.find(({ id }) => id === note.folderId);
    const directory = folder
      ? `${filename(folder.name)} (${filename(folder.id)})/`
      : "";
    files[
      `${directory}${filename(note.title || "Untitled")} (${filename(note.id)}).md`
    ] = strToU8(await noteMarkdown(note));
  }
  return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) =>
      error ? reject(error) : resolve(new Uint8Array(data)),
    );
  });
}
