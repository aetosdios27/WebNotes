import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const foldersRouter = router({
  // GET /api/folders
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.folder.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
    });
  }),

  // POST /api/folders
  create: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(), // ✅ FIX: Accept client ID
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.folder.create({
        data: {
          id: input.id, // ✅ FIX: Use client ID if provided
          name: input.name,
          userId: ctx.userId,
        },
      });
    }),

  // PATCH /api/folders/[id]/rename
  rename: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.folder.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { name: input.newName },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return { success: true };
    }),

  // DELETE /api/folders/[id]
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.folder.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return { success: true };
    }),
});
