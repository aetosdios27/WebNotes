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
    // FIXED: Don't include notes - we fetch them separately
    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

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
    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}