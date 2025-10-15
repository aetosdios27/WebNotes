// src/app/api/notes/[id]/move/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: noteId } = await params;

  // The new folderId can be a string or null (for unfiling)
  const { folderId } = await request.json();

  try {
    const result = await prisma.note.updateMany({
      where: {
        id: noteId,
        userId: userId, // CRITICAL: Ensure the user owns the note
      },
      data: {
        folderId: folderId,
        updatedAt: new Date(), // Update timestamp
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    // FIXED: Return the updated note instead of just a message
    const updatedNote = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!updatedNote) {
      return NextResponse.json({ error: 'Failed to fetch updated note' }, { status: 404 });
    }

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Move note error:', error);
    return NextResponse.json({ error: 'Failed to move note' }, { status: 500 });
  }
}