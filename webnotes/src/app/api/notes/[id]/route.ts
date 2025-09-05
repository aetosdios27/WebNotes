// src/app/api/notes/[id]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // The type was correct, it is a Promise
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  
  // FIX: Await the params Promise to get the id
  const { id } = await params;

  const { htmlContent, textContent } = await request.json();
  const title = (textContent?.split('\n')[0]?.trim() || 'New Note').slice(0, 200);

  try {
    const result = await prisma.note.updateMany({
      where: { id, userId }, // ensures ownership
      data: { title, content: htmlContent },
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // FIX: Await the params Promise to get the id
  const { id } = await params;

  try {
    const result = await prisma.note.deleteMany({
      where: { id, userId }, // ensures ownership
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}