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

  // 1. Get the full request body
  const body = await request.json();

  // 2. Prepare the update data object dynamically
  // Always update the timestamp
  const updateData: any = {
    updatedAt: new Date(),
  };

  // 3. Map specific fields if they exist in the request body
  
  // Handle Content Updates (Editor saves)
  if (body.htmlContent !== undefined) {
    updateData.content = body.htmlContent;
  }
  
  // Handle Title Updates (derived from textContent during editor save)
  if (body.textContent !== undefined) {
    updateData.title = (body.textContent.split('\n')[0]?.trim() || 'New Note').slice(0, 200);
  }

  // Handle Metadata Updates (Font, Pinning, Folders)
  if (body.font !== undefined) updateData.font = body.font;
  if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
  if (body.pinnedAt !== undefined) updateData.pinnedAt = body.pinnedAt;
  if (body.folderId !== undefined) updateData.folderId = body.folderId;

  try {
    const result = await prisma.note.updateMany({
      where: { id, userId }, // Ensures ownership
      data: updateData,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    const note = await prisma.note.findUnique({ where: { id } });
    return NextResponse.json(note);
  } catch (error) {
    console.error("Update error:", error);
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