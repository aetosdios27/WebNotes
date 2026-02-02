import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const notesRouter = router({
  // GET /api/notes
  list: protectedProcedure
    .input(
      z
        .object({
          folderId: z.string().nullish(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.folderId !== undefined && {
            folderId: input.folderId,
          }),
        },
        orderBy: [
          { isPinned: "desc" },
          { pinnedAt: "desc" },
          { updatedAt: "desc" },
        ],
      });
    }),

  // GET /api/notes/[id]
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return note;
    }),

  // POST /api/notes
  create: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(), // ✅ FIX: Accept client ID
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
      return ctx.prisma.note.create({
        data: {
          id: input.id, // ✅ FIX: Use client ID if provided
          title: input.title,
          content: input.content,
          folderId: input.folderId ?? null,
          userId: ctx.userId,
          isPinned: false,
        },
      });
    }),

  // PUT /api/notes/[id]
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

      // Note: Use Prisma types ideally, but keeping logic consistent for now
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found or access denied",
        });
      }

      return ctx.prisma.note.findUnique({ where: { id } });
    }),

  // PATCH /api/notes/[id]/rename
  rename: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().min(1),
      })
    )
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

  // DELETE /api/notes/[id]
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.note.deleteMany({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found or access denied",
        });
      }

      return { success: true };
    }),

  // PATCH /api/notes/[id]/move
  move: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        folderId: z.string().nullish(),
      })
    )
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

      const updatedNote = await ctx.prisma.note.findUnique({
        where: { id: input.id },
      });

      if (!updatedNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Failed to fetch updated note",
        });
      }

      return updatedNote;
    }),

  // PATCH /api/notes/[id]/pin
  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Optimized to 2 queries using update + return
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
