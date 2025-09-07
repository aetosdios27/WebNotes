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
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note moved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to move note' }, { status: 500 });
  }
}