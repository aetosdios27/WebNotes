// src/lib/trpc/routers/_app.ts
import { accountRouter } from "./account";
import { router } from "../init";
import { notesRouter } from "./notes";
import { foldersRouter } from "./folders";
import { versionsRouter } from "./versions"; // <-- Import

export const appRouter = router({
  account: accountRouter,
  notes: notesRouter,
  folders: foldersRouter,
  versions: versionsRouter, // <-- Add to router
});

export type AppRouter = typeof appRouter;
