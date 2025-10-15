// src/app/api/notes/[id]/pin/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: noteId } = await params;

  try {
    // First, get the current note to check its pinned status
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
      select: { isPinned: true },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    // Toggle the pinned status
    const newPinnedStatus = !note.isPinned;
    
    await prisma.note.updateMany({
      where: { id: noteId, userId },
      data: {
        isPinned: newPinnedStatus,
        pinnedAt: newPinnedStatus ? new Date() : null,
      },
    });

    // Fetch and return the updated note
    const updatedNote = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!updatedNote) {
      return NextResponse.json({ error: 'Failed to fetch updated note' }, { status: 404 });
    }

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Pin toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle pin status' }, { status: 500 });
  }
}