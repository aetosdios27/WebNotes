import { TRPCError } from "@trpc/server";

// Resolve unique-key races without updating an existing record or exposing it
// to a different account. Other database failures retain their original meaning.
export async function createOwned<T extends { userId: string }>(options: {
  create: () => Promise<T>;
  findExisting: () => Promise<T | null>;
  userId: string;
}): Promise<T> {
  try {
    return await options.create();
  } catch (error) {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2002") throw error;
    const existing = await options.findExisting();
    if (existing?.userId === options.userId) return existing;
    throw new TRPCError({ code: "CONFLICT", message: "ID is already in use" });
  }
}
