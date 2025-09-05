// src/types/index.ts

// Import the generated types directly from the Prisma Client
import type { Note as PrismaNote, Folder as PrismaFolder } from '@prisma/client';

// Re-export them for use in your application
export type Note = PrismaNote;
export type Folder = PrismaFolder;