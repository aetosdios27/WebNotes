import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const versionsRouter = router({
  list: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.noteId, userId: ctx.userId },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.noteVersion.findMany({
        where: { noteId: input.noteId },
        select: {
          id: true,
          createdAt: true,
          changeType: true,
          title: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  get: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const version = await ctx.prisma.noteVersion.findUnique({
        where: { id: input.versionId },
        include: { note: true },
      });

      if (!version || version.note.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return version;
    }),

  snapshot: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.noteId, userId: ctx.userId },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.noteVersion.create({
        data: {
          noteId: note.id,
          content: note.content || "",
          title: note.title,
          changeType: "manual",
          userId: ctx.userId,
        },
      });
    }),

  restore: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetVersion = await ctx.prisma.noteVersion.findUnique({
        where: { id: input.versionId },
        include: { note: true },
      });

      if (!targetVersion || targetVersion.note.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Backup current state before restoring
      await ctx.prisma.noteVersion.create({
        data: {
          noteId: targetVersion.noteId,
          content: targetVersion.note.content || "",
          title: targetVersion.note.title,
          changeType: "restore_backup",
          userId: ctx.userId,
        },
      });

      return ctx.prisma.note.update({
        where: { id: targetVersion.noteId },
        data: {
          content: targetVersion.content,
          title: targetVersion.title,
          updatedAt: new Date(),
        },
      });
    }),
});
