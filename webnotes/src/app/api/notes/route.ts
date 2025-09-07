// src/app/api/notes/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 });
  }
  const userId = session.user.id;

  try {
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching notes', error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json().catch(() => ({}));
    const folderId = body.folderId || null;

    const newNote = await prisma.note.create({
      data: {
        title: 'New Note',
        content: '',
        userId,
        folderId,
      },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating note', error }, { status: 500 });
  }
}