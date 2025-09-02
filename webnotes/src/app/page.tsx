'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import type { Note } from '@/types';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // This function is now only for the initial load
  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/notes', { cache: 'no-store' });
    if (!res.ok) return;

    const data = await res.json();
    const notesArray = data.rows || []; 
    setNotes(notesArray);

    if (notesArray.length > 0) {
      setActiveNoteId(notesArray[0].id);
    }
  }, []);

  // The change is in the useEffect below
  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove fetchNotes from the dependency array to run only once

  const createNote = async () => {
    // ... createNote function is the same
    const res = await fetch('/api/notes', { method: 'POST' });
    if (res.ok) {
      const newNote: Note = await res.json();
      setNotes(prevNotes => [newNote, ...prevNotes]);
      setActiveNoteId(newNote.id);
    }
  };

  const deleteNote = async (id: string) => {
    // ... deleteNote function is the same
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const newNotes = notes.filter((note: Note) => note.id !== id);
      setNotes(newNotes);

      if (activeNoteId === id) {
        setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
      }
    }
  };

  const handleNoteUpdate = (updatedNote: Note) => {
    // ... handleNoteUpdate function is the same
    setNotes(prevNotes => 
      prevNotes.map((note) => 
        note.id === updatedNote.id ? updatedNote : note
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  };

  const activeNote = notes.find((note: Note) => note.id === activeNoteId);

  return (
    <main className="flex w-screen h-screen">
      <Sidebar 
        notes={notes}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        deleteNote={deleteNote}
        createNote={createNote}
      />
      <div className="flex-1 h-full">
        <NoteEditor activeNote={activeNote} onNoteUpdate={handleNoteUpdate} />
      </div>
    </main>
  );
}