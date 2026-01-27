// src/app/api/notes/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { welcomeNotes } from "@/lib/welcome-notes";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([]);
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  try {
    // Check if user has seen welcome notes
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hasSeenWelcome: true },
    });

    // Only create welcome notes once - with race condition protection
    if (!user?.hasSeenWelcome) {
      // Atomic update: Only succeeds if hasSeenWelcome is still false
      // If two requests race, only one will have count > 0
      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          hasSeenWelcome: false,
        },
        data: { hasSeenWelcome: true },
      });

      // Only create welcome notes if WE flipped the flag
      if (updated.count > 0) {
        await Promise.all(
          welcomeNotes.map((note) =>
            prisma.note.create({
              data: {
                title: note.title,
                content: note.content,
                userId: userId,
                folderId: null,
                isPinned: note.isPinned || false,
                pinnedAt: note.pinnedAt || null,
              },
            })
          )
        );

        console.log("Created welcome notes for new user:", userId);
      }
    }

    const notes = await prisma.note.findMany({
      where: {
        userId: userId,
        folderId: folderId === "null" ? null : folderId,
      },
      orderBy: [
        { isPinned: "desc" },
        { pinnedAt: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error in GET /api/notes:", error);
    return NextResponse.json(
      { message: "Error fetching notes", error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => ({}));
  const folderId = body.folderId || null;
  const title = body.title || "New Note";
  const content = body.content || "";

  try {
    const newNote = await prisma.note.create({
      data: {
        title: title,
        content: content,
        userId: userId,
        folderId: folderId,
        isPinned: false,
      },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/notes:", error);
    return NextResponse.json(
      { message: "Error creating note", error },
      { status: 500 }
    );
  }
}
