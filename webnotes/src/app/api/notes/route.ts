import { NextResponse } from 'next/server';
import { notes } from '@/lib/data';
import type { Note } from '@/types';

// GET all notes
export async function GET() {
  return NextResponse.json(notes);
}

// POST a new note
export async function POST(request: Request) {
  const newNote: Note = {
    id: Date.now().toString(),
    title: 'New Note',
    content: 'New Note\n\n',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  notes.unshift(newNote); // Add to the beginning of the array
  return NextResponse.json(newNote, { status: 201 });
}