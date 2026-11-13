import { Effect } from "effect";
import { TRPCClientError } from "@trpc/client";
import { z } from "zod";
import { trpcVanilla } from "../trpc/client";
import { BodyReader, CloudApi, LocalStore, uploadLocalNotes } from "./program";
import { readBody } from "./read-body";
import { withUploadLock } from "./lock";

const noteSchema = z.object({
  id: z.string(), title: z.string().nullable(), content: z.string().nullable(),
  folderId: z.string().nullable(), createdAt: z.coerce.date(), updatedAt: z.coerce.date(),
  isPinned: z.boolean().optional(), pinnedAt: z.coerce.date().nullish(), font: z.string().nullish(),
});
const folderSchema = z.object({ id: z.string(), name: z.string(), createdAt: z.coerce.date() });
const notesKey = "webnotes_notes_v1";
const foldersKey = "webnotes_folders_v1";

export async function migrateDeviceNotes(userId: string): Promise<number> {
  const run = () => {
    const prefix = `webnotes_upload_v1:${encodeURIComponent(userId)}:`;
    let notesRaw: string | null;
    let foldersRaw: string | null;
    return Effect.runPromise(uploadLocalNotes.pipe(
      Effect.provideService(LocalStore, {
        snapshot: async () => {
          notesRaw = localStorage.getItem(notesKey);
          foldersRaw = localStorage.getItem(foldersKey);
          return {
            notes: z.array(noteSchema).parse(JSON.parse(notesRaw ?? "[]")),
            folders: z.array(folderSchema).parse(JSON.parse(foldersRaw ?? "[]")),
          };
        },
        completed: async (key, version) => localStorage.getItem(prefix + key) === version,
        checkpoint: async (key, version) => { localStorage.setItem(prefix + key, version); },
        finish: async () => {
          if (localStorage.getItem(notesKey) !== notesRaw || localStorage.getItem(foldersKey) !== foldersRaw) {
            throw new Error("Local notes changed during upload; keeping device copies");
          }
          // Each removal is safe after every upload has been acknowledged. A crash
          // between removals is recovered using the per-account checkpoints.
          localStorage.removeItem(notesKey);
          localStorage.removeItem(foldersKey);
          localStorage.setItem("webnotes_migrated", "true");
        },
      }),
      Effect.provideService(CloudApi, {
        createFolder: (folder) => trpcVanilla.folders.create.mutate({ id: folder.id, name: folder.name }),
        createNote: (note) => trpcVanilla.notes.create.mutate({
          id: note.id, title: note.title, content: note.content, folderId: note.folderId,
          isPinned: note.isPinned, pinnedAt: note.pinnedAt, font: note.font,
        }),
        syncBody: (id, update) => trpcVanilla.notes.sync.mutate({ id, update }),
        isRetryable: (cause) => !(cause instanceof TRPCClientError) ||
          cause.data?.code === undefined ||
          ["INTERNAL_SERVER_ERROR", "TIMEOUT", "TOO_MANY_REQUESTS", "SERVICE_UNAVAILABLE"].includes(cause.data.code),
      }),
      Effect.provideService(BodyReader, { read: readBody }),
    ));
  };
  return withUploadLock(run);
}
