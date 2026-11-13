import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createBinarySyncHandlers } from "@/lib/sync/server";
import { createUpdateLog } from "@/lib/sync/update-log";

export const { GET, POST } = createBinarySyncHandlers({
  session: auth,
  ownsNote: async (id, userId) => !!(await prisma.note.findFirst({
    where: { id, userId }, select: { id: true },
  })),
  log: createUpdateLog(prisma),
  touch: id => prisma.note.update({ where: { id }, data: { updatedAt: new Date() } }),
});
