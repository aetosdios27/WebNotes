// src/lib/trpc/routers/notes.ts

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import * as Y from "yjs";

export const notesRouter = router({
  // ==========================================================================
  // SYNC (CRDT MERGE)
  // ==========================================================================

  sync: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        update: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("🔄 SYNC: userId:", ctx.userId, "noteId:", input.id);

      // 1. Fetch current state WITH ownership check
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { yjsState: true },
      });

      if (!note) {
        console.error(
          "❌ SYNC: Note not found!",
          input.id,
          "user:",
          ctx.userId
        );
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // 2. Merge Yjs states
      const mergedDoc = new Y.Doc();

      if (note.yjsState) {
        try {
          Y.applyUpdate(mergedDoc, new Uint8Array(note.yjsState));
        } catch (e) {
          console.error("❌ SYNC: Failed to apply existing state:", e);
        }
      }

      try {
        const incomingUpdate = Buffer.from(input.update, "base64");
        Y.applyUpdate(mergedDoc, new Uint8Array(incomingUpdate));
      } catch (e) {
        console.error("❌ SYNC: Failed to apply incoming update:", e);
        mergedDoc.destroy();
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Yjs update",
        });
      }

      const newState = Buffer.from(Y.encodeStateAsUpdate(mergedDoc));
      mergedDoc.destroy();

      console.log(
        "✅ SYNC: Saving",
        newState.length,
        "bytes for note:",
        input.id
      );

      // 3. Save
      await ctx.prisma.note.update({
        where: { id: input.id },
        data: {
          yjsState: newState,
          updatedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // ==========================================================================
  // LIST NOTES
  // ==========================================================================

  list: protectedProcedure
    .input(
      z
        .object({
          folderId: z.string().nullish(),
          cursor: z.string().nullish(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      console.log("📋 LIST: userId:", ctx.userId, "folderId:", input?.folderId);

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
        ],
      });

      console.log(
        "📋 LIST: Found",
        notes.length,
        "notes:",
        notes.map((n) => ({
          id: n.id.slice(0, 8),
          title: n.title,
          hasYjs: !!n.yjsState,
          contentLen: n.content?.length ?? 0,
        }))
      );

      let nextCursor: string | undefined = undefined;
      if (notes.length > limit) {
        const nextItem = notes.pop();
        nextCursor = nextItem!.id;
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
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("🔍 BYID: userId:", ctx.userId, "noteId:", input.id);

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

      const yjsBase64 = note.yjsState
        ? Buffer.from(note.yjsState).toString("base64")
        : null;

      console.log("✅ BYID: Found note:", {
        id: note.id.slice(0, 8),
        title: note.title,
        hasYjs: !!yjsBase64,
        yjsLen: yjsBase64?.length ?? 0,
        contentLen: note.content?.length ?? 0,
      });

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
        id: z.string().optional(),
        title: z
          .string()
          .nullish()
          .transform((val) => val ?? ""),
        content: z
          .string()
          .nullish()
          .transform((val) => val ?? ""),
        folderId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        "➕ CREATE: userId:",
        ctx.userId,
        "noteId:",
        input.id,
        "title:",
        input.title
      );

      // Initialize empty YDoc for new note
      const doc = new Y.Doc();
      const state = Buffer.from(Y.encodeStateAsUpdate(doc));
      doc.destroy();

      const note = await ctx.prisma.note.create({
        data: {
          id: input.id,
          title: input.title,
          content: input.content,
          yjsState: state,
          folderId: input.folderId ?? null,
          userId: ctx.userId,
          isPinned: false,
        },
      });

      console.log("✅ CREATE: Note created:", note.id.slice(0, 8));

      return note;
    }),

  // ==========================================================================
  // UPDATE (Metadata)
  // ==========================================================================

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        htmlContent: z.string().nullish(),
        textContent: z.string().nullish(),
        font: z.string().nullish(),
        isPinned: z.boolean().nullish(),
        pinnedAt: z.date().nullish(),
        folderId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, htmlContent, textContent, ...metadata } = input;

      console.log("✏️ UPDATE: userId:", ctx.userId, "noteId:", id, "fields:", {
        hasHtmlContent: htmlContent !== undefined && htmlContent !== null,
        htmlContentLen: htmlContent?.length ?? 0,
        hasTextContent: textContent !== undefined && textContent !== null,
        font: metadata.font,
        isPinned: metadata.isPinned,
        folderId: metadata.folderId,
      });

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

      console.log("✏️ UPDATE: Applying:", updateData);

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

      console.log("✅ UPDATE: Success, matched:", result.count);

      return ctx.prisma.note.findUnique({ where: { id } });
    }),

  // ==========================================================================
  // RENAME
  // ==========================================================================

  rename: protectedProcedure
    .input(z.object({ id: z.string(), newName: z.string().min(1) }))
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
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("🗑️ DELETE: userId:", ctx.userId, "noteId:", input.id);

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

      console.log("✅ DELETE: Deleted note:", input.id.slice(0, 8));

      return { success: true };
    }),

  // ==========================================================================
  // MOVE
  // ==========================================================================

  move: protectedProcedure
    .input(z.object({ id: z.string(), folderId: z.string().nullish() }))
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
    .input(z.object({ id: z.string() }))
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
