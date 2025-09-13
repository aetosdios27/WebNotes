// src/app/api/notes/[id]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Handles updating a specific note.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const { htmlContent, textContent } = await request.json();
  
  // Fetch the current note to check its title
  const currentNote = await prisma.note.findUnique({
    where: { id }
  });

  let titleToUpdate = currentNote?.title;
  
  // Only update the title if it's still the default "New Note" or empty
  if (currentNote && (currentNote.title === 'New Note' || !currentNote.title)) {
    titleToUpdate = (textContent?.split('\n')[0]?.trim() || 'New Note').slice(0, 200);
  }

  try {
    const result = await prisma.note.updateMany({
      where: { id, userId }, // Ensures ownership
      data: { title: titleToUpdate, content: htmlContent, updatedAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    const note = await prisma.note.findUnique({ where: { id } });
    return NextResponse.json(note);
  } catch {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

/**
 * Handles deleting a specific note.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  
  // THE FIX: Await the params Promise to get the id
  const { id } = await params;

  try {
    // Use deleteMany with a compound where clause to ensure the user owns the note
    const result = await prisma.note.deleteMany({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
