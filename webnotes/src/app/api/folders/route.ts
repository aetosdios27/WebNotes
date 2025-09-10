// src/app/api/folders/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // THE FIX: Use Prisma's `include` to fetch all folders AND their notes
    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        notes: { // Nest all notes belonging to each folder
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// Your POST function is likely correct and can remain the same
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { name } = await request.json();
    const folder = await prisma.folder.create({
      data: { name, userId },
    });
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}