import { idInput, titleInput, contentInput, fontInput } from "@/lib/input-limits";
import { createOwned } from "../create-owned";
// src/lib/trpc/routers/notes.ts

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import * as Y from "yjs";
import { createUpdateLog } from "@/lib/sync/update-log";
import { decodeClientUpdate, UpdateInputError, updateInput } from "@/lib/sync/update-input";

export const notesRouter = router({
  // ==========================================================================
  // SYNC (APPEND-ONLY CRDT UPDATES)
  // ==========================================================================

  sync: protectedProcedure
    .input(
      z.object({
        id: idInput,
        update: updateInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true },
      });

      if (!note) {
        console.error("❌ SYNC: Note not found!", input.id, "user:", ctx.userId);
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      let incomingUpdate: Uint8Array;
      try {
        incomingUpdate = decodeClientUpdate(input.update);
      } catch (error) {
        if (!(error instanceof UpdateInputError)) throw error;
        throw new TRPCError({
          code: error.code === "TOO_LARGE" ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
          message: error.message,
        });
      }

      const log = createUpdateLog(ctx.prisma);
      await log.appendUpdate(input.id, incomingUpdate);
      await ctx.prisma.note.update({
        where: { id: input.id },
        data: { updatedAt: new Date() },
      });
      await log.compactIfNeeded(input.id);

      return { success: true };
    }),

  // ==========================================================================
  // LIST NOTES
  // ==========================================================================

  list: protectedProcedure
    .input(
      z
        .object({
          folderId: idInput.nullish(),
          cursor: idInput.nullish(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      const notes = await ctx.prisma.note.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.folderId !== undefined && {
            folderId: input.folderId,
          }),
        },
        take: limit + 1,
        ...(input?.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        orderBy: [
          { isPinned: "desc" },
          { pinnedAt: "desc" },
          { updatedAt: "desc" },
          { id: "asc" },
        ],
      });

      let nextCursor: string | undefined = undefined;
      if (notes.length > limit) {
        notes.pop();
        // The next query skips its cursor, so use the last returned note.
        nextCursor = notes[notes.length - 1]?.id;
      }

      return {
        notes: notes.map((n) => ({
          ...n,
          yjsState: null,
        })),
        nextCursor,
      };
    }),

  // ==========================================================================
  // GET NOTE BY ID (Hydration)
  // ==========================================================================

  byId: protectedProcedure
    .input(z.object({ id: idInput }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!note) {
        console.error(
          "❌ BYID: Note not found!",
          input.id,
          "user:",
          ctx.userId
        );
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      const state = await createUpdateLog(ctx.prisma).readState(input.id);
      const yjsBase64 = state ? Buffer.from(state).toString("base64") : null;

      return {
        ...note,
        yjsState: yjsBase64,
      };
    }),

  // ==========================================================================
  // CREATE
  // ==========================================================================

  create: protectedProcedure
    .input(
      z.object({
        id: idInput.optional(),
        title: titleInput
          .nullish()
          .transform((val) => val ?? ""),
        content: contentInput
          .nullish()
          .transform((val) => val ?? ""),
        folderId: idInput.nullish(),
        isPinned: z.boolean().optional(),
        pinnedAt: z.date().nullish(),
        font: fontInput.nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Initialize empty YDoc for new note
      const doc = new Y.Doc();
      const state = Buffer.from(Y.encodeStateAsUpdate(doc));
      doc.destroy();

      const note = await createOwned({
        userId: ctx.userId,
        findExisting: () => input.id ? ctx.prisma.note.findUnique({ where: { id: input.id } }) : Promise.resolve(null),
        create: () => ctx.prisma.note.create({
          data: {
            id: input.id,
            title: input.title,
            content: input.content,
            // Legacy HTML is seeded into Yjs by the editor, which only happens when the
            // server has no Yjs state; an empty doc here would hide that HTML for good.
            yjsState: input.content ? null : state,
            folderId: input.folderId ?? null,
            userId: ctx.userId,
            isPinned: input.isPinned ?? false,
            pinnedAt: input.pinnedAt ?? null,
            font: input.font ?? null,
          },
        }),
      });

      return note;
    }),

  // ==========================================================================
  // UPDATE (Metadata)
  // ==========================================================================

  update: protectedProcedure
    .input(
      z.object({
        id: idInput,
        htmlContent: contentInput.nullish(),
        textContent: contentInput.nullish(),
        font: fontInput.nullish(),
        isPinned: z.boolean().nullish(),
        pinnedAt: z.date().nullish(),
        folderId: idInput.nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, htmlContent, textContent, ...metadata } = input;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (htmlContent !== undefined) {
        updateData.content = htmlContent;
      }

      if (textContent !== undefined) {
        updateData.title = (
          textContent?.split("\n")[0]?.trim() || "New Note"
        ).slice(0, 200);
      }

      if (metadata.font !== undefined) updateData.font = metadata.font;
      if (metadata.isPinned !== undefined)
        updateData.isPinned = metadata.isPinned;
      if (metadata.pinnedAt !== undefined)
        updateData.pinnedAt = metadata.pinnedAt;
      if (metadata.folderId !== undefined)
        updateData.folderId = metadata.folderId;

      const result = await ctx.prisma.note.updateMany({
        where: { id, userId: ctx.userId },
        data: updateData,
      });

      if (result.count === 0) {
        console.error("❌ UPDATE: Note not found!", id, "user:", ctx.userId);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found or access denied",
        });
      }

      return ctx.prisma.note.findUnique({ where: { id } });
    }),

  // ==========================================================================
  // RENAME
  // ==========================================================================

  rename: protectedProcedure
    .input(z.object({ id: idInput, newName: titleInput.min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.note.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { title: input.newName },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return { success: true };
    }),

  // ==========================================================================
  // DELETE
  // ==========================================================================

  delete: protectedProcedure
    .input(z.object({ id: idInput }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.note.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });

      if (result.count === 0) {
        console.error(
          "❌ DELETE: Note not found!",
          input.id,
          "user:",
          ctx.userId
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found or access denied",
        });
      }

      return { success: true };
    }),

  // ==========================================================================
  // MOVE
  // ==========================================================================

  move: protectedProcedure
    .input(z.object({ id: idInput, folderId: idInput.nullish() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.note.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: {
          folderId: input.folderId ?? null,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found or access denied",
        });
      }

      return ctx.prisma.note.findUnique({ where: { id: input.id } });
    }),

  // ==========================================================================
  // TOGGLE PIN
  // ==========================================================================

  togglePin: protectedProcedure
    .input(z.object({ id: idInput }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.note.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true, isPinned: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found or access denied",
        });
      }

      return ctx.prisma.note.update({
        where: { id: input.id },
        data: {
          isPinned: !existing.isPinned,
          pinnedAt: !existing.isPinned ? new Date() : null,
        },
      });
    }),
});
