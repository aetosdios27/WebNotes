// src/app/api/notes/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET all notes from the database
export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM notes ORDER BY "updatedAt" DESC;`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching notes', error }, { status: 500 });
  }
}

// POST a new note to the database
export async function POST(_request: Request) {
  try {
    const userId = 'user_placeholder';
    const now = new Date().toISOString();
    const defaultTitle = 'New Note';
    const defaultContent = `${defaultTitle}\n`;

    // Create note with proper timestamps
    const result = await sql`
      INSERT INTO notes (title, content, "userId", "createdAt", "updatedAt")
      VALUES (${defaultTitle}, ${defaultContent}, ${userId}, ${now}, ${now})
      RETURNING *;
    `;
    
    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'Error creating note', error }, { status: 500 });
  }
}