// src/app/api/notes/sync-beacon/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as Y from "yjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, update } = body;

    if (!id || !update) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check the note exists and belongs to this user
    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
      select: { yjsState: true },
    });

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Merge: load existing state + apply incoming update
    const mergedDoc = new Y.Doc();

    if (note.yjsState) {
      try {
        Y.applyUpdate(mergedDoc, new Uint8Array(note.yjsState));
      } catch (e) {
        console.error("Failed to apply existing Yjs state:", e);
      }
    }

    try {
      const incomingUpdate = Buffer.from(update, "base64");
      Y.applyUpdate(mergedDoc, new Uint8Array(incomingUpdate));
    } catch (e) {
      console.error("Failed to apply incoming update:", e);
      mergedDoc.destroy();
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const newState = Buffer.from(Y.encodeStateAsUpdate(mergedDoc));
    mergedDoc.destroy();

    // Save to database
    await prisma.note.update({
      where: { id },
      data: {
        yjsState: newState,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Beacon sync error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
