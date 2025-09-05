import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 }); // empty list for logged-out users
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

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const newNote = await prisma.note.create({
      data: {
        title: 'New Note',
        content: '',
        userId,
      },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating note', error }, { status: 500 });
  }
}