// src/lib/trpc/routers/_app.ts
import { router } from "../init";
import { notesRouter } from "./notes";
import { foldersRouter } from "./folders";

export const appRouter = router({
  notes: notesRouter,
  folders: foldersRouter,
});

// This type is used by the client
// It's how TypeScript knows what procedures exist
export type AppRouter = typeof appRouter;
