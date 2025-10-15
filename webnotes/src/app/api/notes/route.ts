// src/app/api/notes/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([]);
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  try {
    const notes = await prisma.note.findMany({
      where: {
        userId: userId,
        folderId: folderId === 'null' ? null : folderId,
      },
      orderBy: [
        { isPinned: 'desc' },    // Pinned notes first
        { pinnedAt: 'desc' },    // Then by pin time (most recently pinned first)
        { updatedAt: 'desc' },   // Then by update time
      ],
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
  
  const body = await request.json().catch(() => ({}));
  const folderId = body.folderId || null;

  try {
    const newNote = await prisma.note.create({
      data: {
        title: 'New Note',
        content: '',
        userId: userId,
        folderId: folderId,
        isPinned: false, // Default to unpinned
      },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating note', error }, { status: 500 });
  }
}