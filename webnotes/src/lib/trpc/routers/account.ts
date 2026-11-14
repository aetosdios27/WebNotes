import { protectedProcedure, router } from "../init";

export const accountRouter = router({
  signOutAll: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.session.deleteMany({ where: { userId: ctx.userId } });
  }),
});
