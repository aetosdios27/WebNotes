import { NextResponse, type NextRequest } from 'next/server';
import { notes } from '@/lib/data';

interface PutRequestBody {
  content: string;
}

// PUT (update) a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { content }: PutRequestBody = await request.json();
  const noteIndex = notes.findIndex((note) => note.id === id);

  if (noteIndex === -1) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  
  const title = content.split('\n')[0].trim() || 'New Note';

  notes[noteIndex] = {
    ...notes[noteIndex],
    title,
    content,
    updatedAt: new Date(),
  };

  return NextResponse.json(notes[noteIndex]);
}

// DELETE a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const noteIndex = notes.findIndex((note) => note.id === id);

  if (noteIndex === -1) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  notes.splice(noteIndex, 1);
  return NextResponse.json({ message: 'Note deleted' }, { status: 200 });
}