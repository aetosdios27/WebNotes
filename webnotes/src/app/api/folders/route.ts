import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name cannot be empty."),
});

export async function GET() {
  try {
    // In the future, we will filter by the logged-in user's ID
    const { rows } = await sql`SELECT * FROM folders ORDER BY "createdAt" DESC;`;
    return NextResponse.json({ folders: rows });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { name } = createFolderSchema.parse(json);
    const userId = 'user_placeholder'; // This will be dynamic after auth

    const { rows } = await sql`
      INSERT INTO folders (name, "userId")
      VALUES (${name}, ${userId})
      RETURNING *;
    `;

    return NextResponse.json({ folder: rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }
}