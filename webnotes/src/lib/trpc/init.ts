// src/lib/trpc/init.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Context - available in every procedure
export async function createContext() {
  const session = await auth();

  return {
    session,
    userId: session?.user?.id ?? null,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson, // Handles Dates, Maps, etc.
});

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // Now guaranteed non-null
    },
  });
});

// Exports
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
