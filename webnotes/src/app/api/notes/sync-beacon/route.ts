// src/app/api/notes/sync-beacon/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { createUpdateLog } from "@/lib/sync/update-log";
import { decodeClientUpdate, UpdateInputError } from "@/lib/sync/update-input";

const syncInput = z.object({ id: z.string().min(1), update: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = syncInput.safeParse(await req.json());
    if (!input.success) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { id, update } = input.data;

    // Check the note exists and belongs to this user
    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let incomingUpdate: Uint8Array;
    try {
      incomingUpdate = decodeClientUpdate(update);
    } catch (error) {
      if (!(error instanceof UpdateInputError)) throw error;
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "TOO_LARGE" ? 413 : 400 }
      );
    }

    const log = createUpdateLog(prisma);
    await log.appendUpdate(id, incomingUpdate);
    await prisma.note.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    await log.compactIfNeeded(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Beacon sync error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
