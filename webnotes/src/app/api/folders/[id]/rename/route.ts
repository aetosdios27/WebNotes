// src/app/api/folders/[id]/rename/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed to Promise
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: folderId } = await params; // Added await

  const { newName } = await request.json();
  if (!newName || typeof newName !== 'string') {
    return NextResponse.json({ error: 'Invalid name provided' }, { status: 400 });
  }

  try {
    await prisma.folder.updateMany({
      where: { id: folderId, userId },
      data: { name: newName },
    });
    return NextResponse.json({ message: 'Folder renamed successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
  }
}