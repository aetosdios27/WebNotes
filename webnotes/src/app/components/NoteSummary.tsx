import { formatDistanceToNow } from "date-fns";
import type { Note, Folder } from "@/lib/storage/types";

// Plain text keeps stored HTML inert, including scripts and remote resources.
export function noteText(content: Note["content"]) {
  if (!content) return "";
  const text = content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}
export function NoteMeta({ note, folders }: { note: Note; folders: Folder[] }) {
  const folder = folders.find((folder) => folder.id === note.folderId);
  return (
    <>
      {folder && `${folder.name} · `}
      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
    </>
  );
}
