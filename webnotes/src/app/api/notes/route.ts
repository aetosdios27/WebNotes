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
        // If folderId is 'null' (string), find unfiled notes. Otherwise, find by id.
        folderId: folderId === 'null' ? null : folderId,
      },
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
  
  // FIX: The folderId is now optional from the body
  const body = await request.json().catch(() => ({})); // Handle empty body
  const folderId = body.folderId || null;

  try {
    const newNote = await prisma.note.create({
      data: {
        title: 'New Note',
        content: '',
        userId: userId,
        // This will be null if no folderId is provided, creating an unfiled note
        folderId: folderId, 
      },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating note', error }, { status: 500 });
  }
}