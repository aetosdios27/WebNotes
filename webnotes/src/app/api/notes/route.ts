import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { welcomeNotes } from '@/lib/welcome-notes';

// Check if user is new (has no notes)
async function isNewUser(userId: string): Promise<boolean> {
  const noteCount = await prisma.note.count({
    where: { userId }
  });
  return noteCount === 0;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([]);
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  try {
    // Check if this is a new user
    const isNew = await isNewUser(userId);
    
    // If new user, create welcome notes
    if (isNew) {
      // Create all welcome notes in parallel
      await Promise.all(
        welcomeNotes.map(note => 
          prisma.note.create({
            data: {
              title: note.title,
              content: note.content,
              userId: userId,
              folderId: null,
              isPinned: note.isPinned || false,
              pinnedAt: note.pinnedAt || null,
            }
          })
        )
      );
      
      console.log('Created welcome notes for new user:', userId);
    }

    // Fetch notes (including newly created welcome notes if applicable)
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
    console.error('Error in GET /api/notes:', error);
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
  const title = body.title || 'New Note'; // Use title from body, fallback to default
  const content = body.content || ''; // Use content from body, fallback to empty

  try {
    const newNote = await prisma.note.create({
      data: {
        title: title,
        content: content,
        userId: userId,
        folderId: folderId,
        isPinned: false, // Default to unpinned
      },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/notes:', error);
    return NextResponse.json({ message: 'Error creating note', error }, { status: 500 });
  }
}