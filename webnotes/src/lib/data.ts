import type { Note } from "@prisma/client"; // Import the Note type from Prisma
// A temporary in-memory data store for the MVP.
export const notes: Note[] = [
  {
    id: "1",
    title: "Welcome to WebNotes!",
    content:
      "Welcome to WebNotes!\n\nThis is your first note. Feel free to edit it or create a new one.\n\nEnjoy the clean, simple, and fast note-taking experience.",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "dummy-user-id-123",
    folderId: null,
    isPinned: false,
    pinnedAt: null,
    font: null,
  },
  {
    id: "2",
    title: "My Awesome Note",
    content: "My Awesome Note\n\nThis is another note with some more content.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    userId: "dummy-user-id-123",
    folderId: null,
    isPinned: false,
    pinnedAt: null,
    font: null,
  },
];
