// src/app/api/notes/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await request.json();
  
  // Extract title from first line of content
  const lines = content.split('\n');
  const title = lines[0].trim() || 'Untitled';
  const now = new Date().toISOString();
  
  try {
    const { rows } = await sql`
      UPDATE notes 
      SET title = ${title}, 
          content = ${content}, 
          "updatedAt" = ${now}
      WHERE id = ${id}
      RETURNING *;
    `;
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const { rowCount } = await sql`DELETE FROM notes WHERE id = ${id};`;
    
    if (rowCount === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}