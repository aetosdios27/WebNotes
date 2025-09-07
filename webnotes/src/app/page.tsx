// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import dynamic from 'next/dynamic';
import type { Note } from '@prisma/client';
import { NoteListSkeleton } from './components/NoteListSkeleton';

const NoteEditor = dynamic(() => import('./components/NoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">Loading Editor...</div>,
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('Failed to fetch notes');
      
      const notesArray: Note[] = await res.json();
      setNotes(notesArray);

      if (notesArray.length > 0 && activeNoteId === null) {
        setActiveNoteId(notesArray[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeNoteId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (folderId?: string) => {
    const res = await fetch('/api/notes', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId })
    });
    if (res.ok) {
      const newNote: Note = await res.json();
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      setActiveNoteId(newNote.id);
    }
  };

  const deleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const newNotes = notes.filter((note) => note.id !== id);
      setNotes(newNotes);

      if (activeNoteId === id) {
        setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
      }
    }
  };

  const handleNoteUpdate = (updatedNote: Note) => {
    setNotes((prevNotes) =>
      prevNotes
        .map((note) => (note.id === updatedNote.id ? updatedNote : note))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  };

  const activeNote = notes.find((note) => note.id === activeNoteId);

  return (
    <main className="flex w-screen h-screen">
      {isLoading ? (
        <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800">
          <NoteListSkeleton />
        </div>
      ) : (
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          deleteNote={deleteNote}
          createNote={() => createNote()}
        />
      )}
      <div className="flex-1 h-full">
        <NoteEditor activeNote={activeNote} onNoteUpdate={handleNoteUpdate} />
      </div>
    </main>
  );
}