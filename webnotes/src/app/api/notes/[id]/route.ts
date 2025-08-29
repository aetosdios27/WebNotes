import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await request.json();
 
  // Extract title from first line of content
  const title = content.split('\n')[0].trim() || 'New Note';
 
  try {
    const result = await sql`
      UPDATE notes 
      SET title = ${title}, 
          content = ${content}, 
          "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
   
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
   
    return NextResponse.json(result.rows[0]);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
 
  try {
    await sql`DELETE FROM notes WHERE id = ${id};`;
    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}